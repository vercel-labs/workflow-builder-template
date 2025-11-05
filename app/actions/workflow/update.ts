"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession, verifyWorkflowOwnership } from "./utils";
import type { SavedWorkflow, WorkflowData } from "./types";

/**
 * Update a workflow
 */
export async function update(
  id: string,
  data: Partial<WorkflowData>
): Promise<SavedWorkflow> {
  const session = await getSession();
  await verifyWorkflowOwnership(id, session.user.id);

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.nodes !== undefined) updateData.nodes = data.nodes;
  if (data.edges !== undefined) updateData.edges = data.edges;
  if (data.vercelProjectId !== undefined)
    updateData.vercelProjectId = data.vercelProjectId;

  const [updatedWorkflow] = await db
    .update(workflows)
    .set(updateData)
    .where(eq(workflows.id, id))
    .returning();

  if (!updatedWorkflow) {
    throw new Error("Workflow not found");
  }

  return updatedWorkflow as SavedWorkflow;
}
