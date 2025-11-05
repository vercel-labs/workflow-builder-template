"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession, CURRENT_WORKFLOW_NAME } from "./utils";
import type { WorkflowData } from "./types";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

/**
 * Save the current workflow state
 */
export async function saveCurrent(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<WorkflowData> {
  const session = await getSession();

  if (!(nodes && edges)) {
    throw new Error("Nodes and edges are required");
  }

  // Check if current workflow exists
  const [existingWorkflow] = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.name, CURRENT_WORKFLOW_NAME),
        eq(workflows.userId, session.user.id)
      )
    )
    .limit(1);

  let savedWorkflow;

  if (existingWorkflow) {
    // Update existing current workflow
    [savedWorkflow] = await db
      .update(workflows)
      .set({
        nodes,
        edges,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, existingWorkflow.id))
      .returning();
  } else {
    // Create new current workflow
    [savedWorkflow] = await db
      .insert(workflows)
      .values({
        name: CURRENT_WORKFLOW_NAME,
        description: "Auto-saved current workflow",
        nodes,
        edges,
        userId: session.user.id,
      })
      .returning();
  }

  return {
    id: savedWorkflow.id,
    nodes: savedWorkflow.nodes as WorkflowNode[],
    edges: savedWorkflow.edges as WorkflowEdge[],
  };
}
