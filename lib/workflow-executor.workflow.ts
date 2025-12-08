/**
 * Workflow-based executor using "use workflow" and "use step" directives
 * This executor captures step executions through the workflow SDK for better observability
 */

import {
  preValidateConditionExpression,
  validateConditionExpression,
} from "@/lib/condition-validator";
import {
  getActionLabel,
  getStepImporter,
  type StepImporter,
} from "./step-registry";
import type { StepContext } from "./steps/step-handler";
import { triggerStep } from "./steps/trigger";
import { getErrorMessageAsync } from "./utils";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

// System actions that don't have plugins - maps to module import functions
const SYSTEM_ACTIONS: Record<string, StepImporter> = {
  "Database Query": {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic module import
    importer: () => import("./steps/database-query") as Promise<any>,
    stepFunction: "databaseQueryStep",
  },
  "HTTP Request": {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic module import
    importer: () => import("./steps/http-request") as Promise<any>,
    stepFunction: "httpRequestStep",
  },
  Condition: {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic module import
    importer: () => import("./steps/condition") as Promise<any>,
    stepFunction: "conditionStep",
  },
};

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
  executionId?: string;
  workflowId?: string; // Used by steps to fetch credentials
};

/**
 * Helper to replace template variables in conditions
 */
// biome-ignore lint/nursery/useMaxParams: Helper function needs all parameters for template replacement
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Template variable replacement requires nested logic for standardized outputs
function replaceTemplateVariable(
  match: string,
  nodeId: string,
  rest: string,
  outputs: NodeOutputs,
  evalContext: Record<string, unknown>,
  varCounter: { value: number }
): string {
  const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
  const output = outputs[sanitizedNodeId];

  if (!output) {
    console.log("[Condition] Output not found for node:", sanitizedNodeId);
    return match;
  }

  const dotIndex = rest.indexOf(".");
  let value: unknown;

  if (dotIndex === -1) {
    value = output.data;
  } else if (output.data === null || output.data === undefined) {
    value = undefined;
  } else {
    const fieldPath = rest.substring(dotIndex + 1);
    const fields = fieldPath.split(".");
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic data traversal
    let current: any = output.data;

    // For standardized outputs { success, data, error }, automatically look inside data
    // unless explicitly accessing success/data/error
    const firstField = fields[0];
    if (
      current &&
      typeof current === "object" &&
      "success" in current &&
      "data" in current &&
      firstField !== "success" &&
      firstField !== "data" &&
      firstField !== "error"
    ) {
      current = current.data;
    }

    for (const field of fields) {
      if (current && typeof current === "object") {
        current = current[field];
      } else {
        console.log("[Condition] Field access failed:", fieldPath);
        value = undefined;
        break;
      }
    }
    if (value === undefined && current !== undefined) {
      value = current;
    }
  }

  const varName = `__v${varCounter.value}`;
  varCounter.value += 1;
  evalContext[varName] = value;
  return varName;
}

type ConditionEvalResult = {
  result: boolean;
  resolvedValues: Record<string, unknown>;
};

/**
 * Evaluate condition expression with template variable replacement
 * Uses Function constructor to evaluate user-defined conditions dynamically
 *
 * Security: Expressions are validated before evaluation to prevent code injection.
 * Only comparison operators, logical operators, and whitelisted methods are allowed.
 */
function evaluateConditionExpression(
  conditionExpression: unknown,
  outputs: NodeOutputs
): ConditionEvalResult {
  console.log("[Condition] Original expression:", conditionExpression);

  if (typeof conditionExpression === "boolean") {
    return { result: conditionExpression, resolvedValues: {} };
  }

  if (typeof conditionExpression === "string") {
    // Pre-validate the expression before any processing
    const preValidation = preValidateConditionExpression(conditionExpression);
    if (!preValidation.valid) {
      console.error("[Condition] Pre-validation failed:", preValidation.error);
      console.error("[Condition] Expression was:", conditionExpression);
      return { result: false, resolvedValues: {} };
    }

    try {
      const evalContext: Record<string, unknown> = {};
      const resolvedValues: Record<string, unknown> = {};
      let transformedExpression = conditionExpression;
      const templatePattern = /\{\{@([^:]+):([^}]+)\}\}/g;
      const varCounter = { value: 0 };

      transformedExpression = transformedExpression.replace(
        templatePattern,
        (match, nodeId, rest) => {
          const varName = replaceTemplateVariable(
            match,
            nodeId,
            rest,
            outputs,
            evalContext,
            varCounter
          );
          // Store the resolved value with a readable key (the display text from the template)
          resolvedValues[rest] = evalContext[varName];
          return varName;
        }
      );

      // Validate the transformed expression before evaluation
      const validation = validateConditionExpression(transformedExpression);
      if (!validation.valid) {
        console.error("[Condition] Validation failed:", validation.error);
        console.error("[Condition] Original expression:", conditionExpression);
        console.error(
          "[Condition] Transformed expression:",
          transformedExpression
        );
        return { result: false, resolvedValues };
      }

      const varNames = Object.keys(evalContext);
      const varValues = Object.values(evalContext);

      // Safe to evaluate - expression has been validated
      // Only contains: variables (__v0, __v1), operators, literals, and whitelisted methods
      const evalFunc = new Function(
        ...varNames,
        `return (${transformedExpression});`
      );
      const result = evalFunc(...varValues);
      return { result: Boolean(result), resolvedValues };
    } catch (error) {
      console.error("[Condition] Failed to evaluate condition:", error);
      console.error("[Condition] Expression was:", conditionExpression);
      return { result: false, resolvedValues: {} };
    }
  }

  return { result: Boolean(conditionExpression), resolvedValues: {} };
}

/**
 * Execute a single action step with logging via stepHandler
 * IMPORTANT: Steps receive only the integration ID as a reference to fetch credentials.
 * This prevents credentials from being logged in Vercel's workflow observability.
 */
async function executeActionStep(input: {
  actionType: string;
  config: Record<string, unknown>;
  outputs: NodeOutputs;
  context: StepContext;
}) {
  const { actionType, config, outputs, context } = input;

  // Build step input WITHOUT credentials, but WITH integrationId reference and logging context
  const stepInput: Record<string, unknown> = {
    ...config,
    _context: context,
  };

  // Special handling for Condition action - needs template evaluation
  if (actionType === "Condition") {
    const systemAction = SYSTEM_ACTIONS.Condition;
    const module = await systemAction.importer();
    const originalExpression = stepInput.condition;
    const { result: evaluatedCondition, resolvedValues } =
      evaluateConditionExpression(originalExpression, outputs);
    console.log("[Condition] Final result:", evaluatedCondition);

    return await module[systemAction.stepFunction]({
      condition: evaluatedCondition,
      // Include original expression and resolved values for logging purposes
      expression:
        typeof originalExpression === "string" ? originalExpression : undefined,
      values:
        Object.keys(resolvedValues).length > 0 ? resolvedValues : undefined,
      _context: context,
    });
  }

  // Check system actions first (Database Query, HTTP Request)
  const systemAction = SYSTEM_ACTIONS[actionType];
  if (systemAction) {
    const module = await systemAction.importer();
    const stepFunction = module[systemAction.stepFunction];
    return await stepFunction(stepInput);
  }

  // Look up plugin action from the generated step registry
  const stepImporter = getStepImporter(actionType);
  if (stepImporter) {
    const module = await stepImporter.importer();
    const stepFunction = module[stepImporter.stepFunction];
    if (stepFunction) {
      return await stepFunction(stepInput);
    }

    return {
      success: false,
      error: `Step function "${stepImporter.stepFunction}" not found in module for action "${actionType}". Check that the plugin exports the correct function name.`,
    };
  }

  // Fallback for unknown action types
  return {
    success: false,
    error: `Unknown action type: "${actionType}". This action is not registered in the plugin system. Available system actions: ${Object.keys(SYSTEM_ACTIONS).join(", ")}.`,
  };
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
            // No field path, return the entire output data
            const data = output.data;
            if (data === null || data === undefined) {
              // Return empty string for null/undefined data (e.g., from disabled nodes)
              return "";
            }
            if (typeof data === "object") {
              return JSON.stringify(data);
            }
            return String(data);
          }

          // If data is null/undefined, return empty string instead of trying to access fields
          if (output.data === null || output.data === undefined) {
            return "";
          }

          const fieldPath = rest.substring(dotIndex + 1);
          const fields = fieldPath.split(".");
          // biome-ignore lint/suspicious/noExplicitAny: Dynamic output data traversal
          let current: any = output.data;

          // For standardized outputs { success, data, error }, automatically look inside data
          // unless explicitly accessing success/data/error
          const firstField = fields[0];
          if (
            current &&
            typeof current === "object" &&
            "success" in current &&
            "data" in current &&
            firstField !== "success" &&
            firstField !== "data" &&
            firstField !== "error"
          ) {
            current = current.data;
          }

          for (const field of fields) {
            if (current && typeof current === "object") {
              current = current[field];
            } else {
              // Field access failed, return empty string
              return "";
            }
          }

          // Convert value to string, using JSON.stringify for objects/arrays
          if (current === null || current === undefined) {
            return "";
          }
          if (typeof current === "object") {
            return JSON.stringify(current);
          }
          return String(current);
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

  console.log("[Workflow Executor] Starting workflow execution");

  const { nodes, edges, triggerInput = {}, executionId, workflowId } = input;

  console.log("[Workflow Executor] Input:", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasExecutionId: !!executionId,
    workflowId: workflowId || "none",
  });

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

  console.log(
    "[Workflow Executor] Found",
    triggerNodes.length,
    "trigger nodes"
  );

  // Helper to get a meaningful node name
  function getNodeName(node: WorkflowNode): string {
    if (node.data.label) {
      return node.data.label;
    }
    if (node.data.type === "action") {
      const actionType = node.data.config?.actionType as string;
      if (actionType) {
        // Look up the human-readable label from the step registry
        const label = getActionLabel(actionType);
        if (label) {
          return label;
        }
      }
      return "Action";
    }
    if (node.data.type === "trigger") {
      return (node.data.config?.triggerType as string) || "Trigger";
    }
    return node.data.type;
  }

  // Helper to execute a single node
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Node execution requires type checking and error handling
  async function executeNode(nodeId: string, visited: Set<string> = new Set()) {
    console.log("[Workflow Executor] Executing node:", nodeId);

    if (visited.has(nodeId)) {
      console.log("[Workflow Executor] Node already visited, skipping");
      return; // Prevent cycles
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      console.log("[Workflow Executor] Node not found:", nodeId);
      return;
    }

    // Skip disabled nodes
    if (node.data.enabled === false) {
      console.log("[Workflow Executor] Skipping disabled node:", nodeId);

      // Store null output for disabled nodes so downstream templates don't fail
      const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
      outputs[sanitizedNodeId] = {
        label: node.data.label || nodeId,
        data: null,
      };

      const nextNodes = edgesBySource.get(nodeId) || [];
      await Promise.all(
        nextNodes.map((nextNodeId) => executeNode(nextNodeId, visited))
      );
      return;
    }

    try {
      let result: ExecutionResult;

      if (node.data.type === "trigger") {
        console.log("[Workflow Executor] Executing trigger node");

        const config = node.data.config || {};
        const triggerType = config.triggerType as string;
        let triggerData: Record<string, unknown> = {
          triggered: true,
          timestamp: Date.now(),
        };

        // Handle webhook mock request for test runs
        if (
          triggerType === "Webhook" &&
          config.webhookMockRequest &&
          (!triggerInput || Object.keys(triggerInput).length === 0)
        ) {
          try {
            const mockData = JSON.parse(config.webhookMockRequest as string);
            triggerData = { ...triggerData, ...mockData };
            console.log(
              "[Workflow Executor] Using webhook mock request data:",
              mockData
            );
          } catch (error) {
            console.error(
              "[Workflow Executor] Failed to parse webhook mock request:",
              error
            );
          }
        } else if (triggerInput && Object.keys(triggerInput).length > 0) {
          // Use provided trigger input
          triggerData = { ...triggerData, ...triggerInput };
        }

        // Build context for logging
        const triggerContext: StepContext = {
          executionId,
          nodeId: node.id,
          nodeName: getNodeName(node),
          nodeType: node.data.type,
        };

        // Execute trigger step (handles logging internally)
        const triggerResult = await triggerStep({
          triggerData,
          _context: triggerContext,
        });

        result = {
          success: triggerResult.success,
          data: triggerResult.data,
        };
      } else if (node.data.type === "action") {
        const config = node.data.config || {};
        const actionType = config.actionType as string | undefined;

        console.log("[Workflow Executor] Executing action node:", actionType);

        // Check if action type is defined
        if (!actionType) {
          result = {
            success: false,
            error: `Action node "${node.data.label || node.id}" has no action type configured`,
          };
          results[nodeId] = result;
          return;
        }

        // Process templates in config, but keep condition unprocessed for special handling
        const configWithoutCondition = { ...config };
        const originalCondition = config.condition;
        configWithoutCondition.condition = undefined;

        const processedConfig = processTemplates(
          configWithoutCondition,
          outputs
        );

        // Add back the original condition (unprocessed)
        if (originalCondition !== undefined) {
          processedConfig.condition = originalCondition;
        }

        // Build step context for logging (stepHandler will handle the logging)
        const stepContext: StepContext = {
          executionId,
          nodeId: node.id,
          nodeName: getNodeName(node),
          nodeType: actionType,
        };

        // Execute the action step with stepHandler (logging is handled inside)
        // IMPORTANT: We pass integrationId via config, not actual credentials
        // Steps fetch credentials internally using fetchCredentials(integrationId)
        console.log("[Workflow Executor] Calling executeActionStep");
        const stepResult = await executeActionStep({
          actionType,
          config: processedConfig,
          outputs,
          context: stepContext,
        });

        console.log("[Workflow Executor] Step result received:", {
          hasResult: !!stepResult,
          resultType: typeof stepResult,
        });

        // Check if the step returned an error result
        const isErrorResult =
          stepResult &&
          typeof stepResult === "object" &&
          "success" in stepResult &&
          (stepResult as { success: boolean }).success === false;

        if (isErrorResult) {
          const errorResult = stepResult as {
            success: false;
            error?: string | { message: string };
          };
          // Support both old format (error: string) and new format (error: { message: string })
          const errorMessage =
            typeof errorResult.error === "string"
              ? errorResult.error
              : errorResult.error?.message ||
                `Step "${actionType}" in node "${node.data.label || node.id}" failed without a specific error message.`;
          result = {
            success: false,
            error: errorMessage,
          };
        } else {
          result = {
            success: true,
            data: stepResult,
          };
        }
      } else {
        console.log("[Workflow Executor] Unknown node type:", node.data.type);
        result = {
          success: false,
          error: `Unknown node type "${node.data.type}" in node "${node.data.label || node.id}". Expected "trigger" or "action".`,
        };
      }

      // Store results
      results[nodeId] = result;

      // Store outputs with sanitized nodeId for template variable lookup
      const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
      outputs[sanitizedNodeId] = {
        label: node.data.label || nodeId,
        data: result.data,
      };

      console.log("[Workflow Executor] Node execution completed:", {
        nodeId,
        success: result.success,
      });

      // Execute next nodes
      if (result.success) {
        // Check if this is a condition node
        const isConditionNode =
          node.data.type === "action" &&
          node.data.config?.actionType === "Condition";

        if (isConditionNode) {
          // For condition nodes, only execute next nodes if condition is true
          const conditionResult = (result.data as { condition?: boolean })
            ?.condition;
          console.log(
            "[Workflow Executor] Condition node result:",
            conditionResult
          );

          if (conditionResult === true) {
            const nextNodes = edgesBySource.get(nodeId) || [];
            console.log(
              "[Workflow Executor] Condition is true, executing",
              nextNodes.length,
              "next nodes in parallel"
            );
            // Execute all next nodes in parallel
            await Promise.all(
              nextNodes.map((nextNodeId) => executeNode(nextNodeId, visited))
            );
          } else {
            console.log(
              "[Workflow Executor] Condition is false, skipping next nodes"
            );
          }
        } else {
          // For non-condition nodes, execute all next nodes in parallel
          const nextNodes = edgesBySource.get(nodeId) || [];
          console.log(
            "[Workflow Executor] Executing",
            nextNodes.length,
            "next nodes in parallel"
          );
          // Execute all next nodes in parallel
          await Promise.all(
            nextNodes.map((nextNodeId) => executeNode(nextNodeId, visited))
          );
        }
      }
    } catch (error) {
      console.error("[Workflow Executor] Error executing node:", nodeId, error);
      const errorMessage = await getErrorMessageAsync(error);
      const errorResult = {
        success: false,
        error: errorMessage,
      };
      results[nodeId] = errorResult;
      // Note: stepHandler already logged the error for action steps
      // Trigger steps don't throw, so this catch is mainly for unexpected errors
    }
  }

  // Execute from each trigger node in parallel
  try {
    console.log("[Workflow Executor] Starting execution from trigger nodes");
    const workflowStartTime = Date.now();

    await Promise.all(triggerNodes.map((trigger) => executeNode(trigger.id)));

    const finalSuccess = Object.values(results).every((r) => r.success);
    const duration = Date.now() - workflowStartTime;

    console.log("[Workflow Executor] Workflow execution completed:", {
      success: finalSuccess,
      resultCount: Object.keys(results).length,
      duration,
    });

    // Update execution record if we have an executionId
    if (executionId) {
      try {
        await triggerStep({
          triggerData: {},
          _workflowComplete: {
            executionId,
            status: finalSuccess ? "success" : "error",
            output: Object.values(results).at(-1)?.data,
            error: Object.values(results).find((r) => !r.success)?.error,
            startTime: workflowStartTime,
          },
        });
        console.log("[Workflow Executor] Updated execution record");
      } catch (error) {
        console.error(
          "[Workflow Executor] Failed to update execution record:",
          error
        );
      }
    }

    return {
      success: finalSuccess,
      results,
      outputs,
    };
  } catch (error) {
    console.error(
      "[Workflow Executor] Fatal error during workflow execution:",
      error
    );

    const errorMessage = await getErrorMessageAsync(error);

    // Update execution record with error if we have an executionId
    if (executionId) {
      try {
        await triggerStep({
          triggerData: {},
          _workflowComplete: {
            executionId,
            status: "error",
            error: errorMessage,
            startTime: Date.now(),
          },
        });
      } catch (logError) {
        console.error("[Workflow Executor] Failed to log error:", logError);
      }
    }

    return {
      success: false,
      results,
      outputs,
      error: errorMessage,
    };
  }
}
