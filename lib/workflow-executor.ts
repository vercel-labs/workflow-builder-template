import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

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

class WorkflowExecutor {
  private nodes: Map<string, WorkflowNode>;
  private edges: WorkflowEdge[];
  private results: Map<string, ExecutionResult>;
  private onNodeUpdate?: (
    nodeId: string,
    status: "running" | "success" | "error"
  ) => void;

  constructor(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    onNodeUpdate?: (
      nodeId: string,
      status: "running" | "success" | "error"
    ) => void
  ) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.edges = edges;
    this.results = new Map();
    this.onNodeUpdate = onNodeUpdate;
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

  private async executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    this.onNodeUpdate?.(node.id, "running");

    try {
      // Simulate execution delay for UI
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let result: ExecutionResult = { success: true };

      switch (node.data.type) {
        case "trigger":
          result = {
            success: true,
            data: { triggered: true, timestamp: Date.now() },
          };
          break;

        case "action": {
          // Simulate action execution for UI
          const endpoint = node.data.config?.endpoint as string;
          result = {
            success: true,
            data: {
              endpoint,
              response: {
                status: 200,
                message: "Action executed successfully",
              },
            },
          };
          break;
        }

        case "condition": {
          // Simulate condition evaluation
          const condition = node.data.config?.condition as string;
          const conditionResult = Math.random() > 0.5; // Random for demo
          result = {
            success: true,
            data: { condition, result: conditionResult },
          };
          break;
        }

        case "transform": {
          // Simulate data transformation
          const transformType = node.data.config?.transformType as string;
          result = {
            success: true,
            data: { transformType, transformed: true },
          };
          break;
        }

        default:
          result = { success: false, error: "Unknown node type" };
      }

      this.results.set(node.id, result);
      this.onNodeUpdate?.(node.id, "success");
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      this.results.set(node.id, errorResult);
      this.onNodeUpdate?.(node.id, "error");
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

export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  onNodeUpdate?: (
    nodeId: string,
    status: "running" | "success" | "error"
  ) => void
): Promise<Map<string, ExecutionResult>> {
  const executor = new WorkflowExecutor(nodes, edges, onNodeUpdate);
  return await executor.execute();
}
