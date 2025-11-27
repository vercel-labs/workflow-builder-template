/**
 * Workflow-based executor using "use workflow" and "use step" directives
 * This executor captures step executions through the workflow SDK for better observability
 */

import { getErrorMessageAsync } from "./utils";
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
  executionId?: string;
  workflowId?: string; // Used by steps to fetch credentials
};

/**
 * Execute a single action step
 * IMPORTANT: Steps receive only the integration ID as a reference to fetch credentials.
 * This prevents credentials from being logged in Vercel's workflow observability.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Action type dispatch requires branching logic
async function executeActionStep(input: {
  actionType: string;
  config: Record<string, unknown>;
  outputs: NodeOutputs;
}) {
  const { actionType, config } = input;

  // Helper to replace template variables in conditions
  // biome-ignore lint/nursery/useMaxParams: Helper function needs all parameters for template replacement
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Template variable replacement requires nested logic for field access
  function replaceTemplateVariable(
    match: string,
    nodeId: string,
    rest: string,
    evalContext: Record<string, unknown>,
    varCounter: { value: number }
  ): string {
    const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
    const output = input.outputs[sanitizedNodeId];

    if (!output) {
      console.log("[Condition] Output not found for node:", sanitizedNodeId);
      return match;
    }

    const dotIndex = rest.indexOf(".");
    let value: unknown;

    if (dotIndex === -1) {
      value = output.data;
    } else if (output.data === null || output.data === undefined) {
      // If data is null/undefined (e.g., from disabled node), assign undefined
      value = undefined;
    } else {
      const fieldPath = rest.substring(dotIndex + 1);
      const fields = fieldPath.split(".");
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic data traversal
      let current: any = output.data;

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

  // Build step input WITHOUT credentials, but WITH integrationId reference
  // Steps will fetch credentials internally using this reference
  const stepInput: Record<string, unknown> = {
    ...config,
    // integrationId is already in config from the node configuration
  };

  // Import and execute the appropriate step function
  // Step functions load credentials from process.env themselves
  if (actionType === "Send Email") {
    const { sendEmailStep } = await import(
      "../plugins/resend/steps/send-email/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await sendEmailStep(stepInput as any);
  }
  if (actionType === "Send Slack Message") {
    const { sendSlackMessageStep } = await import(
      "../plugins/slack/steps/send-slack-message/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await sendSlackMessageStep(stepInput as any);
  }
  if (actionType === "Create Ticket") {
    const { createTicketStep } = await import(
      "../plugins/linear/steps/create-ticket/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await createTicketStep(stepInput as any);
  }
  if (actionType === "Generate Text") {
    const { generateTextStep } = await import(
      "../plugins/ai-gateway/steps/generate-text/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await generateTextStep(stepInput as any);
  }
  if (actionType === "Generate Image") {
    const { generateImageStep } = await import(
      "../plugins/ai-gateway/steps/generate-image/step"
    );
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
    // Special handling for condition: process templates and evaluate as JavaScript
    // The condition field is kept as original template string for proper evaluation
    const conditionExpression = stepInput.condition;
    let evaluatedCondition: boolean;

    console.log("[Condition] Original expression:", conditionExpression);

    if (typeof conditionExpression === "boolean") {
      evaluatedCondition = conditionExpression;
    } else if (typeof conditionExpression === "string") {
      try {
        const evalContext: Record<string, unknown> = {};
        let transformedExpression = conditionExpression;
        const templatePattern = /\{\{@([^:]+):([^}]+)\}\}/g;
        const varCounter = { value: 0 };

        transformedExpression = transformedExpression.replace(
          templatePattern,
          (match, nodeId, rest) =>
            replaceTemplateVariable(
              match,
              nodeId,
              rest,
              evalContext,
              varCounter
            )
        );

        const varNames = Object.keys(evalContext);
        const varValues = Object.values(evalContext);

        const evalFunc = new Function(
          ...varNames,
          `return (${transformedExpression});`
        );
        const result = evalFunc(...varValues);
        evaluatedCondition = Boolean(result);
      } catch (error) {
        console.error("[Condition] Failed to evaluate condition:", error);
        console.error("[Condition] Expression was:", conditionExpression);
        // If evaluation fails, treat as false to be safe
        evaluatedCondition = false;
      }
    } else {
      // Coerce to boolean for other types
      evaluatedCondition = Boolean(conditionExpression);
    }

    console.log("[Condition] Final result:", evaluatedCondition);

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await conditionStep({ condition: evaluatedCondition } as any);
  }

  if (actionType === "Scrape") {
    const { firecrawlScrapeStep } = await import(
      "../plugins/firecrawl/steps/scrape/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await firecrawlScrapeStep(stepInput as any);
  }
  if (actionType === "Search") {
    const { firecrawlSearchStep } = await import(
      "../plugins/firecrawl/steps/search/step"
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await firecrawlSearchStep(stepInput as any);
  }

  if (actionType === "Run Actor") {
    const { apifyRunActorStep } = await import(
      "../plugins/apify/steps/run-actor/step"
    );
    // Parse actorInput if it's a JSON string and convert waitForFinish to boolean
    const runActorInput = { ...stepInput };
    if (typeof runActorInput.actorInput === "string") {
      try {
        runActorInput.actorInput = JSON.parse(runActorInput.actorInput);
      } catch {
        // If JSON parsing fails, keep the original string
        console.warn("[Run Actor] Failed to parse actorInput as JSON");
      }
    }
    // Convert waitForFinish string to boolean (checkbox saves as "true"/"false" strings)
    if (typeof runActorInput.waitForFinish === "string") {
      runActorInput.waitForFinish = runActorInput.waitForFinish === "true";
    }
    console.log("[Run Actor] Input:", JSON.stringify(runActorInput, null, 2));
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic step input type
    return await apifyRunActorStep(runActorInput as any);
  }

  // Fallback for unknown action types
  return {
    success: false,
    error: `Unknown action type: ${actionType}`,
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

  // Helper to log node start
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Node name derivation requires type checking
  async function logNodeStart(
    node: WorkflowNode,
    nodeInput?: unknown
  ): Promise<{ logId: string; startTime: number }> {
    if (!executionId) {
      return { logId: "", startTime: Date.now() };
    }

    try {
      // Get a meaningful node name
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

      const { logStep } = await import("./steps/log-step");
      const result = await logStep({
        action: "start",
        executionId,
        nodeId: node.id,
        nodeName,
        nodeType: node.data.type,
        nodeInput,
      });

      return {
        logId: result.logId || "",
        startTime: result.startTime || Date.now(),
      };
    } catch (error) {
      console.error("[Workflow Executor] Failed to log node start:", error);
      return { logId: "", startTime: Date.now() };
    }
  }

  // Helper to log node completion
  async function logNodeComplete(options: {
    logId: string;
    startTime: number;
    status: "success" | "error";
    output?: unknown;
    error?: string;
  }): Promise<void> {
    if (!(executionId && options.logId)) {
      return;
    }

    try {
      const { logStep } = await import("./steps/log-step");
      await logStep({
        action: "complete",
        logId: options.logId,
        startTime: options.startTime,
        status: options.status,
        output: options.output,
        error: options.error,
      });
    } catch (logError) {
      console.error(
        "[Workflow Executor] Failed to log node completion:",
        logError
      );
    }
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

    let logInfo = { logId: "", startTime: Date.now() };

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

        logInfo = await logNodeStart(node, triggerData);

        result = {
          success: true,
          data: triggerData,
        };

        await logNodeComplete({
          logId: logInfo.logId,
          startTime: logInfo.startTime,
          status: "success",
          output: result.data,
        });
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

          await logNodeComplete({
            logId: logInfo.logId,
            startTime: logInfo.startTime,
            status: "error",
            error: result.error,
          });

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

        // Log the input BEFORE enriching with credentials
        // This ensures API keys are never stored in logs
        logInfo = await logNodeStart(node, processedConfig);

        // Execute the action step
        // IMPORTANT: We pass integrationId via config, not actual credentials
        // Steps fetch credentials internally using fetchCredentials(integrationId)
        console.log("[Workflow Executor] Calling executeActionStep");
        const stepResult = await executeActionStep({
          actionType,
          config: processedConfig,
          outputs,
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
          const errorResult = stepResult as { success: false; error?: string };
          result = {
            success: false,
            error: errorResult.error || "Step execution failed",
          };

          await logNodeComplete({
            logId: logInfo.logId,
            startTime: logInfo.startTime,
            status: "error",
            output: stepResult,
            error: result.error,
          });
        } else {
          result = {
            success: true,
            data: stepResult,
          };

          await logNodeComplete({
            logId: logInfo.logId,
            startTime: logInfo.startTime,
            status: "success",
            output: result.data,
          });
        }
      } else {
        console.log("[Workflow Executor] Unknown node type:", node.data.type);
        result = {
          success: false,
          error: `Unknown node type: ${node.data.type}`,
        };

        await logNodeComplete({
          logId: logInfo.logId,
          startTime: logInfo.startTime,
          status: "error",
          error: result.error,
        });
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

      await logNodeComplete({
        logId: logInfo.logId,
        startTime: logInfo.startTime,
        status: "error",
        error: errorResult.error,
      });
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
        const { logStep } = await import("./steps/log-step");
        await logStep({
          action: "complete",
          executionId,
          status: finalSuccess ? "success" : "error",
          output: Object.values(results).at(-1)?.data,
          error: Object.values(results).find((r) => !r.success)?.error,
          startTime: workflowStartTime,
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
        const { logStep } = await import("./steps/log-step");
        await logStep({
          action: "complete",
          executionId,
          status: "error",
          error: errorMessage,
          startTime: Date.now(),
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
