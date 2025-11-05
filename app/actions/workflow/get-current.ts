"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { CURRENT_WORKFLOW_NAME } from "./constants";
import { getSession } from "./utils";
import type { WorkflowData } from "./types";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

/**
 * Get the current workflow state
 */
export async function getCurrent(): Promise<WorkflowData> {
  const session = await getSession();

  const [currentWorkflow] = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.name, CURRENT_WORKFLOW_NAME),
        eq(workflows.userId, session.user.id)
      )
    )
    .orderBy(desc(workflows.updatedAt))
    .limit(1);

  if (!currentWorkflow) {
    // Return empty workflow if no current state exists
    return {
      nodes: [],
      edges: [],
    };
  }

  return {
    id: currentWorkflow.id,
    nodes: currentWorkflow.nodes as WorkflowNode[],
    edges: currentWorkflow.edges as WorkflowEdge[],
  };
}
