import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { SchemaField } from "../components/workflow/config/schema-builder";
import { db } from "./db";
import { projects, workflowExecutionLogs } from "./db/schema";
import { getStep, hasStep } from "./steps";
import {
  type EnvVarConfig,
  enrichStepInput,
  getCredentials,
} from "./steps/credentials";
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
  private readonly executionLogs: Map<string, NodeExecutionLog> = new Map();
  private credentials: EnvVarConfig = {};

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
        decrypt: true, // Decrypt encrypted environment variables
      });

      if (envResult.status === "success" && envResult.envs) {
        // Extract integration keys from environment variables
        const resendApiKey =
          envResult.envs.find((env) => env.key === "RESEND_API_KEY")?.value ||
          null;
        const linearApiKey =
          envResult.envs.find((env) => env.key === "LINEAR_API_KEY")?.value ||
          null;
        const slackApiKey =
          envResult.envs.find((env) => env.key === "SLACK_API_KEY")?.value ||
          null;
        const aiGatewayApiKey =
          envResult.envs.find((env) => env.key === "AI_GATEWAY_API_KEY")
            ?.value || null;

        console.log(
          "[DEBUG Executor] AI_GATEWAY_API_KEY:",
          aiGatewayApiKey ? `${aiGatewayApiKey.substring(0, 10)}...` : "null"
        );

        // Set up credentials for step execution
        // For test runs, use user's stored credentials
        // Note: encrypted env vars from Vercel can't be decrypted via API,
        // so we fallback to local process.env for test runs
        this.credentials = getCredentials("user", {
          RESEND_API_KEY: resendApiKey || process.env.RESEND_API_KEY || undefined,
          LINEAR_API_KEY: linearApiKey || process.env.LINEAR_API_KEY || undefined,
          SLACK_API_KEY: slackApiKey || process.env.SLACK_API_KEY || undefined,
          AI_GATEWAY_API_KEY: aiGatewayApiKey || process.env.AI_GATEWAY_API_KEY || undefined,
          OPENAI_API_KEY:
            envResult.envs.find((env) => env.key === "OPENAI_API_KEY")?.value ||
            process.env.OPENAI_API_KEY ||
            undefined,
          DATABASE_URL:
            envResult.envs.find((env) => env.key === "DATABASE_URL")?.value ||
            process.env.DATABASE_URL ||
            undefined,
        });

        console.log(
          "[DEBUG Executor] credentials.AI_GATEWAY_API_KEY:",
          this.credentials.AI_GATEWAY_API_KEY
            ? `${this.credentials.AI_GATEWAY_API_KEY.substring(0, 10)}...`
            : "undefined"
        );
        console.log(
          "[DEBUG Executor] Using fallback from process.env:",
          !!process.env.AI_GATEWAY_API_KEY
        );
        console.log("[DEBUG Executor] Full credentials keys:", Object.keys(this.credentials));
      }
    } catch (error) {
      console.error("Failed to load project integrations:", error);
      // Fallback to system credentials for production
      this.credentials = getCredentials("system");
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

  private async executeActionNode(
    _node: WorkflowNode,
    actionType: string,
    _nodeConfig: Record<string, unknown>,
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    try {
      console.log(`[Executor] executeActionNode called for: ${actionType}`);
      console.log(
        "[Executor] Raw processedConfig:",
        JSON.stringify(processedConfig, null, 2)
      );

      // Check if we have a step function for this action type
      if (hasStep(actionType)) {
        console.log(`[Executor] Found step function for: ${actionType}`);
        const stepFn = getStep(actionType);
        if (!stepFn) {
          console.error(
            `[Executor] Step function is undefined for: ${actionType}`
          );
          return {
            success: false,
            error: `Step function not found for action type: ${actionType}`,
          };
        }

        // Enrich the processed config with credentials
        const enrichedInput = enrichStepInput(
          actionType,
          processedConfig,
          this.credentials
        );

        console.log(`[Executor] Executing step: ${actionType}`);
        console.log("[Executor] Enriched input:", enrichedInput);

        // Execute the step function
        console.log(`[Executor] About to call stepFn for: ${actionType}`);
        const result = await stepFn(enrichedInput);
        console.log(`[Executor] Step result for ${actionType}:`, result);

        return {
          success: true,
          data: result,
        };
      }

      console.log(
        `[Executor] No step function found for: ${actionType}, using fallback`
      );
      // Fallback for actions without step functions
      return {
        success: true,
        data: { status: 200, message: "Action executed successfully" },
      };
    } catch (error) {
      console.error(
        `[Executor] Error in executeActionNode for ${actionType}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private buildConditionVariables(): {
    idToVarName: Map<string, string>;
  } {
    const idToVarName = new Map<string, string>();

    for (const [nodeId, output] of Object.entries(this.nodeOutputs)) {
      // Create a safe variable name from the node label, or use node ID if label is empty
      const baseName = output.label.trim() || `node_${nodeId}`;
      const varName = baseName.replace(/[^a-zA-Z0-9_$]/g, "_");

      // Store mapping for node ID
      idToVarName.set(nodeId, varName);
    }

    return { idToVarName };
  }

  private transformConditionExpression(
    condition: string,
    labelToVarName: Map<string, string>,
    idToVarName: Map<string, string>
  ): string {
    let transformedCondition = condition;

    // First, handle template syntax: {{@nodeId:Label.field}} or {{@nodeId:Label}}
    const templatePattern = /\{\{@([^:]+):([^}]+)\}\}/g;
    transformedCondition = transformedCondition.replace(
      templatePattern,
      (match, nodeId, rest) => {
        // Get the variable name for this node ID
        const varName = idToVarName.get(nodeId);
        if (!varName) {
          console.warn(
            `[Executor] Node ID "${nodeId}" not found in outputs, keeping original: ${match}`
          );
          return match;
        }

        // Check if there's a field path after the label
        const dotIndex = rest.indexOf(".");
        if (dotIndex === -1) {
          // No field path, just return the variable
          return varName;
        }

        // Extract field path (everything after the first dot, which comes after the label)
        const fieldPath = rest.substring(dotIndex + 1);
        return `${varName}.${fieldPath}`;
      }
    );

    // Then handle node label references (legacy format)
    for (const [label, varName] of labelToVarName.entries()) {
      // Escape special regex characters in the label
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Replace the label with the variable name (word boundary to avoid partial matches)
      const regex = new RegExp(`\\b${escapedLabel}\\b`, "g");
      transformedCondition = transformedCondition.replace(regex, varName);
    }

    return transformedCondition;
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
      // Process the condition expression to replace template variables
      const { idToVarName } = this.buildConditionVariables();
      const transformedCondition = this.transformConditionExpression(
        condition,
        new Map(), // labelToVarName not needed anymore
        idToVarName
      );

      console.log("[Executor] Original condition:", condition);
      console.log("[Executor] Transformed condition:", transformedCondition);

      // Use a simple safe evaluator for the condition
      // We'll evaluate the transformed expression directly
      let conditionResult = false;
      const trimmed = transformedCondition.trim();

      if (trimmed === "true") {
        conditionResult = true;
      } else if (trimmed === "false") {
        conditionResult = false;
      } else {
        // For more complex conditions, we need to safely evaluate them
        // Create a safe evaluation context with node outputs
        const evalContext: Record<string, unknown> = {};
        for (const [nodeId, output] of Object.entries(this.nodeOutputs)) {
          const varName = idToVarName.get(nodeId);
          if (varName) {
            evalContext[varName] = output.data;
          }
        }

        // Use a simple expression evaluator
        // For now, we'll use Function but pass data as parameters (safer than building code strings)
        try {
          const paramNames = Object.keys(evalContext);
          const paramValues = Object.values(evalContext);
          const evalFn = new Function(
            ...paramNames,
            `return (${transformedCondition});`
          );
          conditionResult = Boolean(evalFn(...paramValues));
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
    configToProcess.condition = undefined; // Don't process condition - we'll handle it specially

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
    if (nodeConfig.condition) {
      processedConfig.condition = nodeConfig.condition; // Keep original condition
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
          // Handle condition as an action type
          if (actionType === "Condition") {
            result = this.executeConditionNode(processedConfig);
          } else {
            result = await this.executeActionNode(
              node,
              actionType,
              nodeConfig,
              processedConfig
            );
          }
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

    const actionType = node.data.config?.actionType as string;
    if (node.data.type === "action" && actionType === "Condition") {
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
