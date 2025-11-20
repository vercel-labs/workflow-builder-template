/**
 * Workflow-based executor using "use workflow" and "use step" directives
 * This executor captures step executions through the workflow SDK for better observability
 */

import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

type ExecutionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

type NodeOutputs = Record<string, { label: string; data: unknown }>;

export type WorkflowExecutionInput = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggerInput?: Record<string, unknown>;
  credentials?: Record<string, string>;
};

/**
 * Execute a single action step
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Dynamic import based on action type requires multiple branches
async function executeActionStep(input: {
  actionType: string;
  config: Record<string, unknown>;
  outputs: NodeOutputs;
  credentials?: Record<string, string>;
}) {
  "use step";

  const { actionType, config, credentials } = input;

  // Build step input based on action type
  const stepInput: Record<string, unknown> = { ...config };

  // Add credentials if available
  if (credentials) {
    if (actionType === "Send Email") {
      stepInput.apiKey = credentials.RESEND_API_KEY;
      stepInput.fromEmail = credentials.RESEND_FROM_EMAIL;
    } else if (actionType === "Send Slack Message") {
      stepInput.apiKey = credentials.SLACK_API_KEY;
    } else if (actionType === "Create Ticket" || actionType === "Find Issues") {
      stepInput.apiKey = credentials.LINEAR_API_KEY;
      stepInput.teamId = credentials.LINEAR_TEAM_ID;
    } else if (
      actionType === "Generate Text" ||
      actionType === "Generate Image"
    ) {
      stepInput.apiKey =
        credentials.OPENAI_API_KEY || credentials.AI_GATEWAY_API_KEY;
    } else if (actionType === "Database Query") {
      stepInput.databaseUrl = credentials.DATABASE_URL;
    }
  }

  // Import and execute the appropriate step function
  try {
    if (actionType === "Send Email") {
      const { sendEmailStep } = await import("./steps/send-email");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await sendEmailStep(stepInput as any);
    }
    if (actionType === "Send Slack Message") {
      const { sendSlackMessageStep } = await import(
        "./steps/send-slack-message"
      );
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await sendSlackMessageStep(stepInput as any);
    }
    if (actionType === "Create Ticket") {
      const { createTicketStep } = await import("./steps/create-ticket");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await createTicketStep(stepInput as any);
    }
    if (actionType === "Generate Text") {
      const { generateTextStep } = await import("./steps/generate-text");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await generateTextStep(stepInput as any);
    }
    if (actionType === "Generate Image") {
      const { generateImageStep } = await import("./steps/generate-image");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await generateImageStep(stepInput as any);
    }
    if (actionType === "Database Query") {
      const { databaseQueryStep } = await import("./steps/database-query");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await databaseQueryStep(stepInput as any);
    }
    if (actionType === "HTTP Request") {
      const { httpRequestStep } = await import("./steps/http-request");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await httpRequestStep(stepInput as any);
    }
    if (actionType === "Condition") {
      const { conditionStep } = await import("./steps/condition");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
      return await conditionStep(stepInput as any);
    }

    // Fallback for unknown action types
    return {
      success: false,
      error: `Unknown action type: ${actionType}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process template variables in config
 */
function processTemplates(
  config: Record<string, unknown>,
  outputs: NodeOutputs
): Record<string, unknown> {
  const processed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      // Process template variables like {{@nodeId:Label.field}}
      let processedValue = value;
      const templatePattern = /\{\{@([^:]+):([^}]+)\}\}/g;
      processedValue = processedValue.replace(
        templatePattern,
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Template processing requires nested logic
        (match, nodeId, rest) => {
          const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
          const output = outputs[sanitizedNodeId];
          if (!output) {
            return match;
          }

          const dotIndex = rest.indexOf(".");
          if (dotIndex === -1) {
            return String(output.data);
          }

          const fieldPath = rest.substring(dotIndex + 1);
          const fields = fieldPath.split(".");
          // biome-ignore lint/suspicious/noExplicitAny: Dynamic output data traversal
          let current: any = output.data;

          for (const field of fields) {
            if (current && typeof current === "object") {
              current = current[field];
            } else {
              return match;
            }
          }

          return String(current ?? match);
        }
      );

      processed[key] = processedValue;
    } else {
      processed[key] = value;
    }
  }

  return processed;
}

/**
 * Main workflow executor function
 */
export async function executeWorkflow(input: WorkflowExecutionInput) {
  "use workflow";

  const { nodes, edges, triggerInput = {}, credentials = {} } = input;
  const outputs: NodeOutputs = {};
  const results: Record<string, ExecutionResult> = {};

  // Build node and edge maps
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgesBySource = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = edgesBySource.get(edge.source) || [];
    targets.push(edge.target);
    edgesBySource.set(edge.source, targets);
  }

  // Find trigger nodes
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const triggerNodes = nodes.filter(
    (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id)
  );

  // Helper to execute a single node
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Node execution requires type checking and error handling
  async function executeNode(nodeId: string, visited: Set<string> = new Set()) {
    if (visited.has(nodeId)) {
      return; // Prevent cycles
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      return;
    }

    try {
      let result: ExecutionResult;

      if (node.data.type === "trigger") {
        // Trigger nodes just pass through the input
        result = {
          success: true,
          data: { ...triggerInput, triggered: true, timestamp: Date.now() },
        };
      } else if (node.data.type === "action") {
        const config = node.data.config || {};
        const actionType = config.actionType as string;

        // Process templates in config
        const processedConfig = processTemplates(config, outputs);

        // Execute the action step
        const stepResult = await executeActionStep({
          actionType,
          config: processedConfig,
          outputs,
          credentials,
        });

        result = {
          success: true,
          data: stepResult,
        };
      } else {
        result = {
          success: false,
          error: `Unknown node type: ${node.data.type}`,
        };
      }

      // Store results
      results[nodeId] = result;
      outputs[nodeId] = {
        label: node.data.label || nodeId,
        data: result.data,
      };

      // Execute next nodes
      if (result.success) {
        const nextNodes = edgesBySource.get(nodeId) || [];
        for (const nextNodeId of nextNodes) {
          await executeNode(nextNodeId, visited);
        }
      }
    } catch (error) {
      results[nodeId] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Execute from each trigger node
  for (const trigger of triggerNodes) {
    await executeNode(trigger.id);
  }

  return {
    success: Object.values(results).every((r) => r.success),
    results,
    outputs,
  };
}
