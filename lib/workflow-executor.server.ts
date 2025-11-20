import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { SchemaField } from "../components/workflow/config/schema-builder";
import { db } from "./db";
import { workflowExecutionLogs, workflows } from "./db/schema";
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
  workflowId?: string;
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
    if (!this.context.workflowId) {
      return;
    }

    try {
      const workflowData = await this.fetchWorkflowData();
      if (!workflowData) {
        return;
      }

      const vercelApiToken = process.env.VERCEL_API_TOKEN;
      const vercelTeamId = process.env.VERCEL_TEAM_ID;

      if (!vercelApiToken) {
        return;
      }

      await this.loadEnvironmentVariables(
        workflowData.vercelProjectId,
        vercelApiToken,
        vercelTeamId
      );
    } catch {
      this.credentials = getCredentials("system");
    }
  }

  private async fetchWorkflowData() {
    const workflowData = await db.query.workflows.findFirst({
      where: eq(workflows.id, this.context.workflowId as string),
      columns: {
        vercelProjectId: true,
        userId: true,
      },
    });

    if (!workflowData) {
      return null;
    }

    return workflowData;
  }

  private async loadEnvironmentVariables(
    vercelProjectId: string,
    apiToken: string,
    teamId?: string
  ): Promise<void> {
    const { getEnvironmentVariables } = await import("./integrations/vercel");
    const envResult = await getEnvironmentVariables({
      projectId: vercelProjectId,
      apiToken,
      teamId: teamId || undefined,
      decrypt: true,
    });

    if (envResult.status === "success" && envResult.envs) {
      this.setupCredentials(envResult.envs);
    }
  }

  private setupCredentials(
    envs: Array<{
      key: string;
      value: string;
      type: string;
      id: string;
      target: string[];
    }>
  ): void {
    const findEnvValue = (key: string) =>
      envs.find((env) => env.key === key)?.value || null;

    const aiGatewayApiKey = findEnvValue("AI_GATEWAY_API_KEY");

    this.credentials = getCredentials("user", {
      RESEND_API_KEY: findEnvValue("RESEND_API_KEY") || undefined,
      RESEND_FROM_EMAIL: findEnvValue("RESEND_FROM_EMAIL") || undefined,
      LINEAR_API_KEY: findEnvValue("LINEAR_API_KEY") || undefined,
      SLACK_API_KEY: findEnvValue("SLACK_API_KEY") || undefined,
      AI_GATEWAY_API_KEY: aiGatewayApiKey || undefined,
      OPENAI_API_KEY: findEnvValue("OPENAI_API_KEY") || undefined,
      DATABASE_URL: findEnvValue("DATABASE_URL") || undefined,
    });
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
      return;
    }

    try {
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

      this.executionLogs.set(node.id, {
        logId: log.id,
        startTime: Date.now(),
      });
    } catch {
      // Silently fail
    }
  }

  private async completeNodeExecution(
    node: WorkflowNode,
    status: "success" | "error",
    output?: unknown,
    error?: string
  ): Promise<void> {
    if (!this.context.executionId) {
      return;
    }

    const logInfo = this.executionLogs.get(node.id);
    if (!logInfo?.logId) {
      return;
    }

    try {
      const duration = Date.now() - logInfo.startTime;

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
    } catch {
      // Silently fail
    }
  }

  private async executeActionNode(
    _node: WorkflowNode,
    actionType: string,
    _nodeConfig: Record<string, unknown>,
    processedConfig: Record<string, unknown>
  ): Promise<ExecutionResult> {
    try {
      // Check if we have a step function for this action type
      if (hasStep(actionType)) {
        const stepFn = getStep(actionType);
        if (!stepFn) {
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

        // Execute the step function
        const result = await stepFn(enrichedInput);

        return {
          success: true,
          data: result,
        };
      }

      // Fallback for actions without step functions
      return {
        success: true,
        data: { status: 200, message: "Action executed successfully" },
      };
    } catch (error) {
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
      const { idToVarName } = this.buildConditionVariables();
      const transformedCondition = this.transformConditionExpression(
        condition,
        new Map(),
        idToVarName
      );

      const conditionResult = this.evaluateCondition(
        transformedCondition,
        idToVarName
      );

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

  private evaluateCondition(
    transformedCondition: string,
    idToVarName: Map<string, string>
  ): boolean {
    const trimmed = transformedCondition.trim();

    if (trimmed === "true") {
      return true;
    }
    if (trimmed === "false") {
      return false;
    }

    const evalContext = this.buildEvalContext(idToVarName);
    return this.safeEvaluateExpression(transformedCondition, evalContext);
  }

  private buildEvalContext(
    idToVarName: Map<string, string>
  ): Record<string, unknown> {
    const evalContext: Record<string, unknown> = {};
    for (const [nodeId, output] of Object.entries(this.nodeOutputs)) {
      const varName = idToVarName.get(nodeId);
      if (varName) {
        evalContext[varName] = output.data;
      }
    }
    return evalContext;
  }

  private safeEvaluateExpression(
    expression: string,
    context: Record<string, unknown>
  ): boolean {
    try {
      const paramNames = Object.keys(context);
      const paramValues = Object.values(context);
      const evalFn = new Function(...paramNames, `return (${expression});`);
      return Boolean(evalFn(...paramValues));
    } catch (evalError) {
      throw new Error(
        `Invalid condition expression: ${evalError instanceof Error ? evalError.message : "Unknown error"}`
      );
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

  private executeTriggerNode(
    nodeConfig: Record<string, unknown>
  ): ExecutionResult {
    const triggerType = nodeConfig.triggerType as string;
    let triggerData: Record<string, unknown> = {
      triggered: true,
      timestamp: Date.now(),
    };

    if (triggerType === "Webhook" && nodeConfig.webhookMockRequest) {
      try {
        // Parse the mock request JSON
        const mockData = JSON.parse(nodeConfig.webhookMockRequest as string);
        triggerData = { ...triggerData, ...mockData };
      } catch {
        // If parsing fails, fall back to default behavior
        triggerData.input = this.context.input;
      }
    } else if (this.context.input) {
      // For other trigger types or when no mock request, use context input
      triggerData = { ...triggerData, ...this.context.input };
    }

    return {
      success: true,
      data: triggerData,
    };
  }

  private async executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    try {
      const nodeConfig = node.data.config || {};

      const actionType = nodeConfig.actionType as string;
      const processedConfig = this.prepareProcessedConfig(nodeConfig);

      await this.startNodeExecution(node, processedConfig);

      let result: ExecutionResult;

      switch (node.data.type) {
        case "trigger":
          result = this.executeTriggerNode(nodeConfig);
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

      await this.completeNodeExecution(
        node,
        result.success ? "success" : "error",
        result.data,
        result.error
      );

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
