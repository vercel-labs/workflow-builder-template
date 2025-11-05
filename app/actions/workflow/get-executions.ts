"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Get execution history for a workflow
 */
export async function getExecutions(id: string) {
  const session = await getSession();
  await verifyWorkflowOwnership(id, session.user.id);

  // Fetch executions
  const executions = await db.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.workflowId, id),
    orderBy: [desc(workflowExecutions.startedAt)],
    limit: 50,
  });

  return executions;
}
