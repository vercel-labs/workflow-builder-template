import "server-only";

import { GoogleGenAI } from "@google/genai";
import { generateObject, generateText } from "ai";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";
import type { SchemaField } from "../components/workflow/config/schema-builder";
import { db } from "./db";
import { user, workflowExecutionLogs } from "./db/schema";
import { callApi } from "./integrations/api";
import { queryData } from "./integrations/database";
import { createTicket, findIssues } from "./integrations/linear";
import { sendEmail } from "./integrations/resend";
import { sendSlackMessage } from "./integrations/slack";
import { type NodeOutputs, processConfigTemplates } from "./utils/template";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

interface NodeExecutionLog {
  logId?: string;
  startTime: number;
}

type ExecutionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export interface WorkflowExecutionContext {
  executionId?: string;
  userId?: string;
  input?: Record<string, unknown>;
}

interface UserIntegrations {
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  linearApiKey?: string | null;
  slackApiKey?: string | null;
}

/**
 * Convert SchemaField[] to Zod schema
 */
function schemaFieldsToZod(
  fields: SchemaField[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape: Record<string, any> = {};

  for (const field of fields) {
    let zodType: z.ZodTypeAny;

    switch (field.type) {
      case "string":
        zodType = z.string();
        if (field.description) {
          zodType = zodType.describe(field.description);
        }
        break;
      case "number":
        zodType = z.number();
        if (field.description) {
          zodType = zodType.describe(field.description);
        }
        break;
      case "boolean":
        zodType = z.boolean();
        if (field.description) {
          zodType = zodType.describe(field.description);
        }
        break;
      case "array":
        if (field.itemType === "string") {
          zodType = z.array(z.string());
        } else if (field.itemType === "number") {
          zodType = z.array(z.number());
        } else if (field.itemType === "boolean") {
          zodType = z.array(z.boolean());
        } else if (field.itemType === "object" && field.fields) {
          zodType = z.array(schemaFieldsToZod(field.fields));
        } else {
          zodType = z.array(z.any());
        }
        if (field.description) {
          zodType = zodType.describe(field.description);
        }
        break;
      case "object":
        if (field.fields && field.fields.length > 0) {
          zodType = schemaFieldsToZod(field.fields);
        } else {
          zodType = z.object({});
        }
        if (field.description) {
          zodType = zodType.describe(field.description);
        }
        break;
      default:
        zodType = z.any();
    }

    shape[field.name] = zodType;
  }

  return z.object(shape);
}

class ServerWorkflowExecutor {
  private nodes: Map<string, WorkflowNode>;
  private edges: WorkflowEdge[];
  private results: Map<string, ExecutionResult>;
  private nodeOutputs: NodeOutputs = {};
  private context: WorkflowExecutionContext;
  private userIntegrations: UserIntegrations = {};
  private executionLogs: Map<string, NodeExecutionLog> = new Map();

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

  private async loadUserIntegrations(): Promise<void> {
    if (!this.context.userId) return;

    try {
      const userData = await db.query.user.findFirst({
        where: eq(user.id, this.context.userId),
        columns: {
          resendApiKey: true,
          resendFromEmail: true,
          linearApiKey: true,
          slackApiKey: true,
        },
      });

      if (userData) {
        this.userIntegrations = {
          resendApiKey: userData.resendApiKey,
          resendFromEmail: userData.resendFromEmail,
          linearApiKey: userData.linearApiKey,
          slackApiKey: userData.slackApiKey,
        };
      }
    } catch (error) {
      console.error("Failed to load user integrations:", error);
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

      const [log] = await db
        .insert(workflowExecutionLogs)
        .values({
          executionId: this.context.executionId,
          nodeId: node.id,
          nodeName: node.data.label || node.data.type,
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

  private async executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    try {
      // Build config properly for logging and execution
      const nodeConfig = node.data.config || {};

      console.log(`[Executor] ===== EXECUTING NODE ${node.id} =====`);
      console.log("[Executor] Node type:", node.data.type);
      console.log("[Executor] Node label:", node.data.label);
      console.log(
        "[Executor] Original node.data.config:",
        JSON.stringify(nodeConfig, null, 2)
      );

      await this.startNodeExecution(node, nodeConfig);

      let result: ExecutionResult = { success: true };

      // Get actionType from original config (not processed) to avoid template corruption
      const actionType = nodeConfig.actionType as string;

      console.log("[Executor] actionType:", actionType);

      // Process templates in node configuration using outputs from previous nodes
      // But exclude actionType, aiModel, and imageModel from processing
      const configToProcess = { ...nodeConfig };
      delete configToProcess.actionType;
      delete configToProcess.aiModel;
      delete configToProcess.imageModel;

      console.log(
        "[Executor] Config to process (excluding model fields):",
        JSON.stringify(configToProcess, null, 2)
      );

      const processedConfig = processConfigTemplates(
        configToProcess as Record<string, unknown>,
        this.nodeOutputs
      );

      // Add back the non-processed values
      processedConfig.actionType = actionType;
      if (nodeConfig.aiModel) {
        processedConfig.aiModel = nodeConfig.aiModel;
        console.log("[Executor] Added back aiModel:", nodeConfig.aiModel);
      }
      if (nodeConfig.imageModel) {
        processedConfig.imageModel = nodeConfig.imageModel;
        console.log("[Executor] Added back imageModel:", nodeConfig.imageModel);
      }

      console.log(
        "[Executor] Final processedConfig:",
        JSON.stringify(processedConfig, null, 2)
      );

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

        case "action": {
          const endpoint = processedConfig?.endpoint as string;

          // Determine the type of action and execute accordingly
          if (
            actionType === "Send Email" ||
            node.data.label.toLowerCase().includes("email")
          ) {
            if (this.userIntegrations.resendApiKey) {
              const emailParams = {
                to: (processedConfig?.emailTo as string) || "user@example.com",
                subject:
                  (processedConfig?.emailSubject as string) || "Notification",
                body: (processedConfig?.emailBody as string) || "No content",
                apiKey: this.userIntegrations.resendApiKey,
                fromEmail: this.userIntegrations.resendFromEmail || undefined,
              };
              const emailResult = await sendEmail(emailParams);
              result = {
                success: emailResult.status === "success",
                data: emailResult,
              };
              if (emailResult.status === "error") {
                result.error = emailResult.error;
              }
            } else {
              result = {
                success: false,
                error:
                  "Resend API key not configured. Please configure in settings.",
              };
            }
          } else if (
            actionType === "Send Slack Message" ||
            node.data.label.toLowerCase().includes("slack")
          ) {
            if (this.userIntegrations.slackApiKey) {
              const slackParams = {
                channel:
                  (processedConfig?.slackChannel as string) || "#general",
                text: (processedConfig?.slackMessage as string) || "No message",
                apiKey: this.userIntegrations.slackApiKey,
              };
              const slackResult = await sendSlackMessage(slackParams);
              result = {
                success: slackResult.status === "success",
                data: slackResult,
              };
              if (slackResult.status === "error") {
                result.error = slackResult.error;
              }
            } else {
              result = {
                success: false,
                error:
                  "Slack API key not configured. Please configure in settings.",
              };
            }
          } else if (
            actionType === "Create Ticket" ||
            node.data.label.toLowerCase().includes("ticket")
          ) {
            if (this.userIntegrations.linearApiKey) {
              const ticketParams = {
                title: (processedConfig?.ticketTitle as string) || "New Ticket",
                description:
                  (processedConfig?.ticketDescription as string) || "",
                priority: processedConfig?.ticketPriority
                  ? Number.parseInt(processedConfig.ticketPriority as string)
                  : undefined,
                apiKey: this.userIntegrations.linearApiKey,
              };
              const ticketResult = await createTicket(ticketParams);
              result = {
                success: ticketResult.status === "success",
                data: ticketResult,
              };
              if (ticketResult.status === "error") {
                result.error = ticketResult.error;
              }
            } else {
              result = {
                success: false,
                error:
                  "Linear API key not configured. Please configure in settings.",
              };
            }
          } else if (actionType === "Find Issues") {
            if (this.userIntegrations.linearApiKey) {
              const findParams = {
                assigneeId: processedConfig?.linearAssigneeId as
                  | string
                  | undefined,
                teamId: processedConfig?.linearTeamId as string | undefined,
                status: processedConfig?.linearStatus as string | undefined,
                label: processedConfig?.linearLabel as string | undefined,
                apiKey: this.userIntegrations.linearApiKey,
              };
              const findResult = await findIssues(findParams);
              result = {
                success: findResult.status === "success",
                data: findResult,
              };
              if (findResult.status === "error") {
                result.error = findResult.error;
              }
            } else {
              result = {
                success: false,
                error:
                  "Linear API key not configured. Please configure in settings.",
              };
            }
          } else if (
            actionType === "Database Query" ||
            node.data.label.toLowerCase().includes("database")
          ) {
            const dbResult = await queryData("your_table", {});
            result = { success: dbResult.status === "success", data: dbResult };
          } else if (actionType === "Generate Text") {
            console.log("[Executor] ===== GENERATE TEXT ACTION =====");
            console.log(
              "[Executor] processedConfig.aiModel:",
              processedConfig?.aiModel
            );
            console.log(
              "[Executor] typeof processedConfig.aiModel:",
              typeof processedConfig?.aiModel
            );

            try {
              const modelId =
                (processedConfig?.aiModel as string) || "gpt-4o-mini";
              const prompt = (processedConfig?.aiPrompt as string) || "";
              const aiFormat = (processedConfig?.aiFormat as string) || "text";
              const aiSchema = processedConfig?.aiSchema as string | undefined;

              console.log("[Executor] Using model ID:", modelId);
              console.log("[Executor] Using prompt:", prompt);
              console.log("[Executor] Format:", aiFormat);

              if (prompt) {
                // Convert model ID to provider/model format
                let modelString: string;
                if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
                  modelString = `openai/${modelId}`;
                } else if (modelId.startsWith("claude-")) {
                  modelString = `anthropic/${modelId}`;
                } else {
                  modelString = modelId;
                }

                console.log(
                  "[Executor] Converted to model string:",
                  modelString
                );

                if (aiFormat === "object" && aiSchema) {
                  // Use generateObject with schema
                  try {
                    const schemaFields = JSON.parse(aiSchema) as SchemaField[];
                    const zodSchema = schemaFieldsToZod(schemaFields);

                    console.log(
                      "[Executor] Calling generateObject with schema"
                    );

                    const { object } = await generateObject({
                      model: modelString,
                      schema: zodSchema,
                      prompt,
                    });

                    console.log(
                      "[Executor] Object generated successfully:",
                      object
                    );

                    result = {
                      success: true,
                      data: object,
                    };
                  } catch (schemaError) {
                    console.error(
                      "[Executor] Schema parsing error:",
                      schemaError
                    );
                    result = {
                      success: false,
                      error: `Schema error: ${schemaError instanceof Error ? schemaError.message : "Invalid schema"}`,
                    };
                  }
                } else {
                  // Use generateText for text format
                  console.log("[Executor] Calling generateText with:", {
                    model: modelString,
                    promptLength: prompt.length,
                  });

                  const { text } = await generateText({
                    model: modelString,
                    prompt,
                  });

                  console.log(
                    "[Executor] Text generated successfully, length:",
                    text?.length
                  );

                  result = {
                    success: true,
                    data: {
                      text,
                      model: modelId,
                    },
                  };
                }
              } else {
                result = {
                  success: false,
                  error: "Prompt is required for Generate Text action",
                };
              }
            } catch (error) {
              console.error("[Executor] Generate Text error:", error);
              console.error("[Executor] Error details:", {
                message: error instanceof Error ? error.message : "Unknown",
                stack: error instanceof Error ? error.stack : undefined,
              });
              result = {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate text",
              };
            }
          } else if (actionType === "Generate Image") {
            console.log("[Executor] ===== GENERATE IMAGE ACTION =====");
            console.log(
              "[Executor] processedConfig.imageModel:",
              processedConfig?.imageModel
            );
            console.log(
              "[Executor] typeof processedConfig.imageModel:",
              typeof processedConfig?.imageModel
            );

            try {
              const modelId =
                (processedConfig?.imageModel as string) || "openai/dall-e-3";
              const prompt = (processedConfig?.imagePrompt as string) || "";

              console.log("[Executor] Using model ID:", modelId);
              console.log("[Executor] Using prompt:", prompt);

              if (prompt) {
                // Parse provider and model from modelId (e.g., "openai/dall-e-3" or "google/gemini-2.5-flash-image")
                const [provider, modelName] = modelId.split("/");

                console.log("[Executor] Parsed provider:", provider);
                console.log("[Executor] Parsed model name:", modelName);

                let base64Image: string;

                if (provider === "openai") {
                  const openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    baseURL: process.env.AI_GATEWAY_URL,
                  });

                  console.log("[Executor] Calling OpenAI image generation...");

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
                  console.log(
                    "[Executor] OpenAI image generated, base64 length:",
                    base64Image.length
                  );
                } else if (provider === "google") {
                  const genai = new GoogleGenAI({
                    apiKey: process.env.GOOGLE_API_KEY,
                  });

                  console.log(
                    "[Executor] Calling Google Gemini image generation..."
                  );

                  const response = await genai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                  });

                  // Extract image data from response
                  const imagePart =
                    response.candidates?.[0]?.content?.parts?.find(
                      (part) => part.inlineData
                    );

                  if (imagePart?.inlineData?.data) {
                    base64Image = imagePart.inlineData.data;
                    console.log(
                      "[Executor] Google image generated, base64 length:",
                      base64Image.length
                    );
                  } else {
                    throw new Error("No image data in Google response");
                  }
                } else {
                  result = {
                    success: false,
                    error: `Unsupported provider: ${provider}. Use "openai" or "google".`,
                  };
                  break;
                }

                result = {
                  success: true,
                  data: {
                    base64: base64Image,
                    model: modelId,
                  },
                };
              } else {
                result = {
                  success: false,
                  error: "Prompt is required for Generate Image action",
                };
              }
            } catch (error) {
              console.error("[Executor] Generate Image error:", error);
              console.error("[Executor] Error details:", {
                message: error instanceof Error ? error.message : "Unknown",
                stack: error instanceof Error ? error.stack : undefined,
              });
              result = {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate image",
              };
            }
          } else if (actionType === "HTTP Request" || endpoint) {
            const httpMethod =
              (processedConfig?.httpMethod as string) || "POST";
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
            result = {
              success: apiResult.status === "success",
              data: apiResult,
            };
            if (apiResult.status === "error") {
              result.error = apiResult.error;
            }
          } else {
            result = {
              success: true,
              data: { status: 200, message: "Action executed successfully" },
            };
          }
          break;
        }

        case "condition": {
          const condition = processedConfig?.condition as string;
          // Evaluate condition (simplified - in production use a safe eval or expression parser)
          // For now, just return true
          const conditionResult = true;
          result = {
            success: true,
            data: { condition, result: conditionResult },
          };
          break;
        }

        case "transform": {
          const transformType = processedConfig?.transformType as string;
          result = {
            success: true,
            data: {
              ...this.context.input,
              transformType,
              transformed: true,
              timestamp: Date.now(),
            },
          };
          break;
        }

        default:
          result = { success: false, error: "Unknown node type" };
      }

      this.results.set(node.id, result);

      // Store node output for use in subsequent nodes
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
    if (!node) return;

    // Execute current node
    const result = await this.executeNode(node);

    // If successful, execute next nodes
    if (result.success) {
      const nextNodes = this.getNextNodes(nodeId);
      for (const nextNodeId of nextNodes) {
        await this.executeSequentially(nextNodeId, visited);
      }
    }
  }

  async execute(): Promise<Map<string, ExecutionResult>> {
    // Load user integrations before executing
    await this.loadUserIntegrations();

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
