import "server-only";

import { GoogleGenAI } from "@google/genai";
import { generateObject, generateText } from "ai";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";
import type { SchemaField } from "../components/workflow/config/schema-builder";
import { db } from "./db";
import { projects, workflowExecutionLogs } from "./db/schema";
import { callApi } from "./integrations/api";
import { createTicket, findIssues } from "./integrations/linear";
import { sendEmail } from "./integrations/resend";
import { sendSlackMessage } from "./integrations/slack";
import { type NodeOutputs, processConfigTemplates } from "./utils/template";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

type NodeExecutionLog = {
  logId?: string;
  startTime: number;
};

type ExecutionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type WorkflowExecutionContext = {
  executionId?: string;
  userId?: string;
  projectId?: string;
  input?: Record<string, unknown>;
};

type ProjectIntegrations = {
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  linearApiKey?: string | null;
  slackApiKey?: string | null;
};

/**
 * Add description to Zod type if present
 */
function addDescription(
  zodType: z.ZodTypeAny,
  description?: string
): z.ZodTypeAny {
  return description ? zodType.describe(description) : zodType;
}

/**
 * Convert array type to Zod schema
 */
function arrayToZod(field: SchemaField): z.ZodTypeAny {
  if (field.itemType === "string") {
    return z.array(z.string());
  }
  if (field.itemType === "number") {
    return z.array(z.number());
  }
  if (field.itemType === "boolean") {
    return z.array(z.boolean());
  }
  if (field.itemType === "object" && field.fields) {
    return z.array(schemaFieldsToZod(field.fields));
  }
  return z.array(z.any());
}

/**
 * Convert object type to Zod schema
 */
function objectToZod(field: SchemaField): z.ZodTypeAny {
  if (field.fields && field.fields.length > 0) {
    return schemaFieldsToZod(field.fields);
  }
  return z.object({});
}

/**
 * Convert a single SchemaField to Zod type
 */
function fieldToZodType(field: SchemaField): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;

  switch (field.type) {
    case "string":
      zodType = z.string();
      break;
    case "number":
      zodType = z.number();
      break;
    case "boolean":
      zodType = z.boolean();
      break;
    case "array":
      zodType = arrayToZod(field);
      break;
    case "object":
      zodType = objectToZod(field);
      break;
    default:
      zodType = z.any();
  }

  return addDescription(zodType, field.description);
}

/**
 * Convert SchemaField[] to Zod schema
 */
function schemaFieldsToZod(
  fields: SchemaField[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.name] = fieldToZodType(field);
  }

  return z.object(shape);
}

class ServerWorkflowExecutor {
  private readonly nodes: Map<string, WorkflowNode>;
  private readonly edges: WorkflowEdge[];
  private readonly results: Map<string, ExecutionResult>;
  private readonly nodeOutputs: NodeOutputs = {};
  private readonly context: WorkflowExecutionContext;
  private projectIntegrations: ProjectIntegrations = {};
  private readonly executionLogs: Map<string, NodeExecutionLog> = new Map();

  constructor(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: WorkflowExecutionContext = {}
  ) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.edges = edges;
    this.results = new Map();
    this.context = context;
  }

  private async loadProjectIntegrations(): Promise<void> {
    if (!this.context.projectId) {
      return;
    }

    try {
      const projectData = await db.query.projects.findFirst({
        where: eq(projects.id, this.context.projectId),
        columns: {
          vercelProjectId: true,
          userId: true,
        },
      });

      if (!projectData) {
        console.error("Project not found");
        return;
      }

      // Get app-level Vercel credentials from env vars
      const vercelApiToken = process.env.VERCEL_API_TOKEN;
      const vercelTeamId = process.env.VERCEL_TEAM_ID;

      if (!vercelApiToken) {
        console.error("Vercel API token not configured");
        return;
      }

      // Fetch environment variables from Vercel
      const { getEnvironmentVariables } = await import("./integrations/vercel");
      const envResult = await getEnvironmentVariables({
        projectId: projectData.vercelProjectId,
        apiToken: vercelApiToken,
        teamId: vercelTeamId || undefined,
      });

      if (envResult.status === "success" && envResult.envs) {
        // Extract integration keys from environment variables
        const resendApiKey =
          envResult.envs.find((env) => env.key === "RESEND_API_KEY")?.value ||
          null;
        const resendFromEmail =
          envResult.envs.find((env) => env.key === "RESEND_FROM_EMAIL")
            ?.value || null;
        const linearApiKey =
          envResult.envs.find((env) => env.key === "LINEAR_API_KEY")?.value ||
          null;
        const slackApiKey =
          envResult.envs.find((env) => env.key === "SLACK_API_KEY")?.value ||
          null;

        this.projectIntegrations = {
          resendApiKey,
          resendFromEmail,
          linearApiKey,
          slackApiKey,
        };
      }
    } catch (error) {
      console.error("Failed to load project integrations:", error);
    }
  }

  private getNextNodes(nodeId: string): string[] {
    return this.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.target);
  }

  private getTriggerNodes(): WorkflowNode[] {
    const nodesWithIncoming = new Set(this.edges.map((e) => e.target));
    return Array.from(this.nodes.values()).filter(
      (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id)
    );
  }

  private async startNodeExecution(
    node: WorkflowNode,
    input?: unknown
  ): Promise<void> {
    if (!this.context.executionId) {
      console.warn(
        "[Executor] No executionId, skipping log for node:",
        node.id
      );
      return;
    }

    try {
      console.log(`[Executor] Starting node ${node.id} (${node.data.type})`);

      // Get a meaningful node name based on label, action type, or trigger type
      let nodeName = node.data.label;
      if (!nodeName) {
        if (node.data.type === "action") {
          nodeName = (node.data.config?.actionType as string) || "Action";
        } else if (node.data.type === "trigger") {
          nodeName = (node.data.config?.triggerType as string) || "Trigger";
        } else {
          nodeName = node.data.type;
        }
      }

      const [log] = await db
        .insert(workflowExecutionLogs)
        .values({
          executionId: this.context.executionId,
          nodeId: node.id,
          nodeName,
          nodeType: node.data.type,
          status: "running",
          input,
          startedAt: new Date(),
        })
        .returning();

      console.log("[Executor] Created log entry:", log.id);

      this.executionLogs.set(node.id, {
        logId: log.id,
        startTime: Date.now(),
      });
    } catch (err) {
      console.error("Failed to start node execution log:", err);
    }
  }

  private async completeNodeExecution(
    node: WorkflowNode,
    status: "success" | "error",
    output?: unknown,
    error?: string
  ): Promise<void> {
    if (!this.context.executionId) {
      console.warn(
        "[Executor] No executionId, skipping completion for node:",
        node.id
      );
      return;
    }

    const logInfo = this.executionLogs.get(node.id);
    if (!logInfo?.logId) {
      console.warn("[Executor] No log entry found for node:", node.id);
      return;
    }

    try {
      const duration = Date.now() - logInfo.startTime;

      console.log(
        `[Executor] Completing node ${node.id} with status ${status}, duration ${duration}ms`
      );

      await db
        .update(workflowExecutionLogs)
        .set({
          status,
          output,
          error,
          completedAt: new Date(),
          duration: duration.toString(),
        })
        .where(eq(workflowExecutionLogs.id, logInfo.logId));

      console.log(`[Executor] Updated log entry ${logInfo.logId}`);
    } catch (err) {
      console.error("Failed to complete node execution log:", err);
    }
  }

  private async executeSendEmailAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (!this.projectIntegrations.resendApiKey) {
      return {
        success: false,
        error: "Resend API key not configured. Please configure in settings.",
      };
    }

    const emailParams = {
      to: (processedConfig?.emailTo as string) || "user@example.com",
      subject: (processedConfig?.emailSubject as string) || "Notification",
      body: (processedConfig?.emailBody as string) || "No content",
      apiKey: this.projectIntegrations.resendApiKey,
      fromEmail: this.projectIntegrations.resendFromEmail || undefined,
    };

    const emailResult = await sendEmail(emailParams);
    return {
      success: emailResult.status === "success",
      data: emailResult,
      error: emailResult.status === "error" ? emailResult.error : undefined,
    };
  }

  private async executeSendSlackMessageAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (!this.projectIntegrations.slackApiKey) {
      return {
        success: false,
        error: "Slack API key not configured. Please configure in settings.",
      };
    }

    const slackParams = {
      channel: (processedConfig?.slackChannel as string) || "#general",
      text: (processedConfig?.slackMessage as string) || "No message",
      apiKey: this.projectIntegrations.slackApiKey,
    };

    const slackResult = await sendSlackMessage(slackParams);
    return {
      success: slackResult.status === "success",
      data: slackResult,
      error: slackResult.status === "error" ? slackResult.error : undefined,
    };
  }

  private async executeCreateTicketAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (!this.projectIntegrations.linearApiKey) {
      return {
        success: false,
        error: "Linear API key not configured. Please configure in settings.",
      };
    }

    const ticketParams = {
      title: (processedConfig?.ticketTitle as string) || "New Ticket",
      description: (processedConfig?.ticketDescription as string) || "",
      priority: processedConfig?.ticketPriority
        ? Number.parseInt(processedConfig.ticketPriority as string, 10)
        : undefined,
      apiKey: this.projectIntegrations.linearApiKey,
    };

    const ticketResult = await createTicket(ticketParams);
    return {
      success: ticketResult.status === "success",
      data: ticketResult,
      error: ticketResult.status === "error" ? ticketResult.error : undefined,
    };
  }

  private async executeFindIssuesAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (!this.projectIntegrations.linearApiKey) {
      return {
        success: false,
        error: "Linear API key not configured. Please configure in settings.",
      };
    }

    const findParams = {
      assigneeId: processedConfig?.linearAssigneeId as string | undefined,
      teamId: processedConfig?.linearTeamId as string | undefined,
      status: processedConfig?.linearStatus as string | undefined,
      label: processedConfig?.linearLabel as string | undefined,
      apiKey: this.projectIntegrations.linearApiKey,
    };

    const findResult = await findIssues(findParams);
    return {
      success: findResult.status === "success",
      data: findResult,
      error: findResult.status === "error" ? findResult.error : undefined,
    };
  }

  // Helper to validate database query input
  private validateDatabaseQueryInput(
    dbQuery: string | undefined,
    dataSourceId: string | undefined
  ): ExecutionResult | null {
    if (!dbQuery || dbQuery.trim() === "") {
      return {
        success: false,
        error: "SQL query is required for Database Query action",
      };
    }

    if (!dataSourceId || dataSourceId === "") {
      return {
        success: false,
        error:
          "Data source not configured. Please add a data source in settings and select it in the action configuration.",
      };
    }

    return null;
  }

  // Helper to validate data against schema
  private validateAgainstSchema(
    data: unknown,
    dbSchema: string
  ): ExecutionResult | null {
    try {
      const schemaFields = JSON.parse(dbSchema) as SchemaField[];
      if (schemaFields.length > 0) {
        const zodSchema = schemaFieldsToZod(schemaFields);

        if (Array.isArray(data)) {
          const validatedData = data.map((row) => zodSchema.parse(row));
          return { success: true, data: validatedData };
        }

        const validatedData = zodSchema.parse(data);
        return { success: true, data: validatedData };
      }

      return { success: true, data };
    } catch (schemaError) {
      return {
        success: false,
        error: `Schema validation error: ${schemaError instanceof Error ? schemaError.message : "Invalid data structure"}`,
      };
    }
  }

  private async executeDatabaseQueryAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const dbQuery = processedConfig?.dbQuery as string;
    const dataSourceId = processedConfig?.dataSourceId as string;
    const dbSchema = processedConfig?.dbSchema as string | undefined;

    // Validate input
    const validationError = this.validateDatabaseQueryInput(
      dbQuery,
      dataSourceId
    );
    if (validationError) {
      return validationError;
    }

    // Execute query
    const { executeQuery } = await import("./integrations/database");
    const dbResult = await executeQuery({ query: dbQuery });

    // Handle validation with schema
    if (dbSchema && dbResult.status === "success") {
      const schemaResult = this.validateAgainstSchema(dbResult.data, dbSchema);
      if (schemaResult) {
        return schemaResult;
      }
    }

    // Return result
    if (dbResult.status === "success") {
      return { success: true, data: dbResult.data };
    }

    return {
      success: false,
      data: undefined,
      error: dbResult.error,
    };
  }

  // Helper to log Generate Text action debug info
  private logGenerateTextDebugInfo(nodeConfig: Record<string, unknown>): void {
    console.log("[Executor] ===== GENERATE TEXT ACTION =====");
    console.log(
      "[Executor] Original aiPrompt (before processing):",
      nodeConfig.aiPrompt
    );
    console.log(
      "[Executor] Available node outputs:",
      Object.entries(this.nodeOutputs).map(([id, output]) => ({
        id,
        label: output.label,
        dataPreview: JSON.stringify(output.data).substring(0, 200),
      }))
    );
  }

  // Helper to get model string from model ID
  private getModelString(modelId: string): string {
    if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
      return `openai/${modelId}`;
    }
    if (modelId.startsWith("claude-")) {
      return `anthropic/${modelId}`;
    }
    return modelId;
  }

  // Helper to generate object with schema
  private async generateObjectWithSchema(
    modelString: string,
    prompt: string,
    aiSchema: string
  ): Promise<ExecutionResult> {
    try {
      const schemaFields = JSON.parse(aiSchema) as SchemaField[];
      const zodSchema = schemaFieldsToZod(schemaFields);

      const { object } = await generateObject({
        model: modelString,
        schema: zodSchema,
        prompt,
      });

      return { success: true, data: object };
    } catch (schemaError) {
      return {
        success: false,
        error: `Schema error: ${schemaError instanceof Error ? schemaError.message : "Invalid schema"}`,
      };
    }
  }

  private async executeGenerateTextAction(
    nodeConfig: Record<string, unknown>,
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    this.logGenerateTextDebugInfo(nodeConfig);

    try {
      const modelId = (processedConfig?.aiModel as string) || "gpt-4o-mini";
      const prompt = (processedConfig?.aiPrompt as string) || "";
      const aiFormat = (processedConfig?.aiFormat as string) || "text";
      const aiSchema = processedConfig?.aiSchema as string | undefined;

      console.log("[Executor] Using model ID:", modelId);
      console.log(
        "[Executor] Processed prompt (after template processing):",
        prompt
      );

      if (!prompt) {
        return {
          success: false,
          error: "Prompt is required for Generate Text action",
        };
      }

      const modelString = this.getModelString(modelId);

      // Handle object format with schema
      if (aiFormat === "object" && aiSchema) {
        return await this.generateObjectWithSchema(
          modelString,
          prompt,
          aiSchema
        );
      }

      // Generate text
      const { text } = await generateText({
        model: modelString,
        prompt,
      });

      return {
        success: true,
        data: { text, model: modelId },
      };
    } catch (error) {
      console.error("[Executor] Generate Text error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate text",
      };
    }
  }

  private async executeGenerateImageAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    console.log("[Executor] ===== GENERATE IMAGE ACTION =====");

    try {
      const modelId =
        (processedConfig?.imageModel as string) || "openai/dall-e-3";
      const prompt = (processedConfig?.imagePrompt as string) || "";

      if (!prompt) {
        return {
          success: false,
          error: "Prompt is required for Generate Image action",
        };
      }

      const [provider, modelName] = modelId.split("/");
      let base64Image: string;

      if (provider === "openai") {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.AI_GATEWAY_URL,
        });

        const response = await openai.images.generate({
          model: modelName,
          prompt,
          n: 1,
          response_format: "b64_json",
        });

        if (!response.data?.[0]?.b64_json) {
          throw new Error("No image data in OpenAI response");
        }

        base64Image = response.data[0].b64_json;
      } else if (provider === "google") {
        const genai = new GoogleGenAI({
          apiKey: process.env.GOOGLE_API_KEY,
        });

        const response = await genai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
          (part) => part.inlineData
        );

        if (imagePart?.inlineData?.data) {
          base64Image = imagePart.inlineData.data;
        } else {
          throw new Error("No image data in Google response");
        }
      } else {
        return {
          success: false,
          error: `Unsupported provider: ${provider}. Use "openai" or "google".`,
        };
      }

      return {
        success: true,
        data: { base64: base64Image, model: modelId },
      };
    } catch (error) {
      console.error("[Executor] Generate Image error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  }

  private async executeCodeAction(
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    console.log("[Executor] ===== EXECUTE CODE ACTION =====");

    try {
      const code = (processedConfig?.code as string) || "";
      const _codeLanguage =
        (processedConfig?.codeLanguage as string) || "javascript";

      if (code.trim() === "") {
        return {
          success: false,
          error: "Code is required for Execute Code action",
        };
      }

      // biome-ignore lint/suspicious/noEmptyBlockStatements: Required to get AsyncFunction constructor
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

      const safeContext = {
        outputs: this.nodeOutputs,
        console: {
          log: (...args: unknown[]) => {
            console.log("[UserCode]", ...args);
          },
          error: (...args: unknown[]) => {
            console.error("[UserCode]", ...args);
          },
          warn: (...args: unknown[]) => {
            console.warn("[UserCode]", ...args);
          },
        },
      };

      const userFunction = new (
        AsyncFunction as new (
          ...params: string[]
        ) => (...values: unknown[]) => Promise<unknown>
      )(
        "outputs",
        "console",
        `
        "use strict";
        ${code}
      `
      );

      const executionResult = await userFunction(
        safeContext.outputs,
        safeContext.console
      );

      return { success: true, data: executionResult };
    } catch (error) {
      console.error("[Executor] Execute Code error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to execute code",
      };
    }
  }

  private async executeHTTPRequestAction(
    processedConfig: Record<string, unknown>,
    endpoint?: string
  ): Promise<ExecutionResult> {
    const httpMethod = (processedConfig?.httpMethod as string) || "POST";
    const httpHeaders = processedConfig?.httpHeaders
      ? JSON.parse((processedConfig.httpHeaders as string) || "{}")
      : {};
    let httpBody = processedConfig?.httpBody
      ? JSON.parse((processedConfig.httpBody as string) || "{}")
      : this.context.input;

    if (httpMethod === "GET") {
      httpBody = undefined;
    }

    const apiResult = await callApi({
      url: endpoint || "https://api.example.com/endpoint",
      method: httpMethod as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      headers: httpHeaders,
      body: httpBody,
    });

    return {
      success: apiResult.status === "success",
      data: apiResult,
      error: apiResult.status === "error" ? apiResult.error : undefined,
    };
  }

  private executeActionNode(
    node: WorkflowNode,
    actionType: string,
    nodeConfig: Record<string, unknown>,
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const endpoint = processedConfig?.endpoint as string;

    if (
      actionType === "Send Email" ||
      node.data.label.toLowerCase().includes("email")
    ) {
      return this.executeSendEmailAction(processedConfig);
    }

    if (
      actionType === "Send Slack Message" ||
      node.data.label.toLowerCase().includes("slack")
    ) {
      return this.executeSendSlackMessageAction(processedConfig);
    }

    if (
      actionType === "Create Ticket" ||
      node.data.label.toLowerCase().includes("ticket")
    ) {
      return this.executeCreateTicketAction(processedConfig);
    }

    if (actionType === "Find Issues") {
      return this.executeFindIssuesAction(processedConfig);
    }

    if (
      actionType === "Database Query" ||
      node.data.label.toLowerCase().includes("database")
    ) {
      return this.executeDatabaseQueryAction(processedConfig);
    }

    if (actionType === "Generate Text") {
      return this.executeGenerateTextAction(nodeConfig, processedConfig);
    }

    if (actionType === "Generate Image") {
      return this.executeGenerateImageAction(processedConfig);
    }

    if (actionType === "Execute Code") {
      return this.executeCodeAction(processedConfig);
    }

    if (actionType === "HTTP Request" || endpoint) {
      return this.executeHTTPRequestAction(processedConfig, endpoint);
    }

    return Promise.resolve({
      success: true,
      data: { status: 200, message: "Action executed successfully" },
    });
  }

  private executeConditionNode(
    processedConfig: Record<string, unknown>
  ): ExecutionResult {
    const condition = processedConfig?.condition as string;

    if (!condition || condition.trim() === "") {
      return {
        success: false,
        error: "Condition expression is required",
      };
    }

    try {
      let conditionResult = false;
      const trimmed = condition.trim();

      if (trimmed === "true") {
        conditionResult = true;
      } else if (trimmed === "false") {
        conditionResult = false;
      } else {
        try {
          const evalFn = new Function(`"use strict"; return (${condition});`);
          conditionResult = Boolean(evalFn());
        } catch (evalError) {
          console.error("[Executor] Condition evaluation error:", evalError);
          return {
            success: false,
            error: `Invalid condition expression: ${evalError instanceof Error ? evalError.message : "Unknown error"}`,
          };
        }
      }

      return {
        success: true,
        data: { condition, result: conditionResult },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to evaluate condition: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private prepareProcessedConfig(
    nodeConfig: Record<string, unknown>
  ): Record<string, unknown> {
    const configToProcess = { ...nodeConfig };
    configToProcess.actionType = undefined;
    configToProcess.aiModel = undefined;
    configToProcess.imageModel = undefined;

    const processedConfig = processConfigTemplates(
      configToProcess as Record<string, unknown>,
      this.nodeOutputs
    );

    // Add back the non-processed values
    processedConfig.actionType = nodeConfig.actionType;
    if (nodeConfig.aiModel) {
      processedConfig.aiModel = nodeConfig.aiModel;
    }
    if (nodeConfig.imageModel) {
      processedConfig.imageModel = nodeConfig.imageModel;
    }

    return processedConfig;
  }

  private async executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    try {
      const nodeConfig = node.data.config || {};

      console.log(`[Executor] ===== EXECUTING NODE ${node.id} =====`);
      console.log("[Executor] Node type:", node.data.type);
      console.log("[Executor] Node label:", node.data.label);

      const actionType = nodeConfig.actionType as string;
      const processedConfig = this.prepareProcessedConfig(nodeConfig);

      await this.startNodeExecution(node, processedConfig);

      let result: ExecutionResult;

      switch (node.data.type) {
        case "trigger":
          result = {
            success: true,
            data: {
              triggered: true,
              timestamp: Date.now(),
              input: this.context.input,
            },
          };
          break;

        case "action":
          result = await this.executeActionNode(
            node,
            actionType,
            nodeConfig,
            processedConfig
          );
          break;

        case "condition":
          result = this.executeConditionNode(processedConfig);
          break;

        case "transform":
          result = {
            success: true,
            data: {
              ...this.context.input,
              transformType: processedConfig?.transformType as string,
              transformed: true,
              timestamp: Date.now(),
            },
          };
          break;

        default:
          result = { success: false, error: "Unknown node type" };
      }

      this.results.set(node.id, result);
      this.nodeOutputs[node.id] = {
        label: node.data.label,
        data: result.data,
      };

      await this.completeNodeExecution(node, "success", result.data);

      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      this.results.set(node.id, errorResult);
      await this.completeNodeExecution(
        node,
        "error",
        undefined,
        errorResult.error
      );

      return errorResult;
    }
  }

  private async executeSequentially(
    nodeId: string,
    visited: Set<string> = new Set()
  ): Promise<void> {
    if (visited.has(nodeId)) {
      return; // Prevent cycles
    }

    visited.add(nodeId);
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const result = await this.executeNode(node);

    if (!result.success) {
      return;
    }

    const nextNodes = this.getNextNodes(nodeId);

    if (node.data.type === "condition") {
      const conditionResult = (result.data as { result?: boolean })?.result;
      if (conditionResult === true) {
        for (const nextNodeId of nextNodes) {
          await this.executeSequentially(nextNodeId, visited);
        }
      }
    } else {
      for (const nextNodeId of nextNodes) {
        await this.executeSequentially(nextNodeId, visited);
      }
    }
  }

  async execute(): Promise<Map<string, ExecutionResult>> {
    // Load project integrations before executing
    await this.loadProjectIntegrations();

    const triggerNodes = this.getTriggerNodes();

    if (triggerNodes.length === 0) {
      throw new Error("No trigger nodes found");
    }

    // Execute from each trigger node
    for (const trigger of triggerNodes) {
      await this.executeSequentially(trigger.id);
    }

    return this.results;
  }
}

export async function executeWorkflowServer(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  context: WorkflowExecutionContext = {}
): Promise<Map<string, ExecutionResult>> {
  const executor = new ServerWorkflowExecutor(nodes, edges, context);
  return await executor.execute();
}
