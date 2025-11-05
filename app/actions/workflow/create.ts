"use server";

import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession } from "./utils";
import type { SavedWorkflow, WorkflowData } from "./types";

/**
 * Create a new workflow
 */
export async function create(
  data: Omit<WorkflowData, "id">
): Promise<SavedWorkflow> {
  const session = await getSession();

  if (!(data.name && data.nodes && data.edges)) {
    throw new Error("Name, nodes, and edges are required");
  }

  const [newWorkflow] = await db
    .insert(workflows)
    .values({
      name: data.name,
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      userId: session.user.id,
      vercelProjectId: data.vercelProjectId || null,
    })
    .returning();

  return newWorkflow as SavedWorkflow;
}
