"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";
import { getSession } from "./utils";

/**
 * Get detailed logs for a specific execution
 */
export async function getExecutionLogs(executionId: string) {
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

  // Get logs
  const logs = await db.query.workflowExecutionLogs.findMany({
    where: eq(workflowExecutionLogs.executionId, executionId),
    orderBy: [desc(workflowExecutionLogs.timestamp)],
  });

  return {
    execution,
    logs,
  };
}
