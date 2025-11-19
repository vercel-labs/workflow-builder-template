"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import type { SavedWorkflow, WorkflowData } from "./types";
import { getSession, verifyWorkflowOwnership } from "./utils";

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
  const updateData: {
    updatedAt: Date;
    name?: string;
    description?: string | null;
    nodes?: WorkflowData["nodes"];
    edges?: WorkflowData["edges"];
  } = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.nodes !== undefined) {
    updateData.nodes = data.nodes;
  }
  if (data.edges !== undefined) {
    updateData.edges = data.edges;
  }

  const [updatedWorkflow] = await db
    .update(workflows)
    .set(updateData)
    .where(eq(workflows.id, id))
    .returning();

  if (!updatedWorkflow) {
    throw new Error("Workflow not found");
  }

  return {
    ...updatedWorkflow,
    createdAt: updatedWorkflow.createdAt.toISOString(),
    updatedAt: updatedWorkflow.updatedAt.toISOString(),
    lastDeployedAt: updatedWorkflow.lastDeployedAt?.toISOString() || null,
  } as SavedWorkflow;
}
