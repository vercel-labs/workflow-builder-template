"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const session = await getSession();
  await verifyWorkflowOwnership(id, session.user.id);

  const [deletedWorkflow] = await db
    .delete(workflows)
    .where(eq(workflows.id, id))
    .returning();

  if (!deletedWorkflow) {
    throw new Error("Workflow not found");
  }
}
