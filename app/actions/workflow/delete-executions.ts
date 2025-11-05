"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Delete all executions for a workflow
 */
export async function deleteExecutions(
  id: string
): Promise<{ success: boolean; deletedCount: number }> {
  const session = await getSession();
  await verifyWorkflowOwnership(id, session.user.id);

  // Get all execution IDs for this workflow
  const executions = await db.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.workflowId, id),
    columns: { id: true },
  });

  const executionIds = executions.map((e) => e.id);

  // Delete logs first (if there are any executions)
  if (executionIds.length > 0) {
    await db
      .delete(workflowExecutionLogs)
      .where(inArray(workflowExecutionLogs.executionId, executionIds));

    // Then delete the executions
    await db
      .delete(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, id));
  }

  return {
    success: true,
    deletedCount: executionIds.length,
  };
}
