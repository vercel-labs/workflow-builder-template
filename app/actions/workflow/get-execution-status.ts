"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";
import { getSession } from "./utils";

type NodeStatus = {
  nodeId: string;
  status: "pending" | "running" | "success" | "error";
};

/**
 * Get the current status of an execution
 */
export async function getExecutionStatus(executionId: string): Promise<{
  status: string;
  nodeStatuses: NodeStatus[];
}> {
  const session = await getSession();

  // Get the execution and verify ownership
  const execution = await db.query.workflowExecutions.findFirst({
    where: eq(workflowExecutions.id, executionId),
    with: {
      workflow: true,
    },
  });

  if (!execution) {
    throw new Error("Execution not found");
  }

  // Verify the workflow belongs to the user
  if (execution.workflow.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Get logs for all nodes
  const logs = await db.query.workflowExecutionLogs.findMany({
    where: eq(workflowExecutionLogs.executionId, executionId),
  });

  // Map logs to node statuses
  const nodeStatuses: NodeStatus[] = logs.map((log) => ({
    nodeId: log.nodeId,
    status: log.status,
  }));

  return {
    status: execution.status,
    nodeStatuses,
  };
}
