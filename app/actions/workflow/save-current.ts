"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { createProject } from "@/lib/integrations/vercel";
import { generateId } from "@/lib/utils/id";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { CURRENT_WORKFLOW_NAME } from "./constants";
import type { WorkflowData } from "./types";
import { getSession } from "./utils";

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

  let savedWorkflow: typeof existingWorkflow;

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
    // Create new current workflow with a dedicated Vercel project
    const workflowId = generateId();

    // Get app-level Vercel credentials from env vars
    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelApiToken) {
      throw new Error("Vercel API token not configured");
    }

    // Create Vercel project with workflow-builder-[workflowId] format
    const vercelProjectName = `workflow-builder-${workflowId}`;
    const result = await createProject({
      name: vercelProjectName,
      apiToken: vercelApiToken,
      teamId: vercelTeamId,
    });

    if (result.status === "error") {
      throw new Error(result.error);
    }

    if (!result.project) {
      throw new Error("Failed to create project on Vercel");
    }

    [savedWorkflow] = await db
      .insert(workflows)
      .values({
        id: workflowId,
        name: CURRENT_WORKFLOW_NAME,
        description: "Auto-saved current workflow",
        nodes,
        edges,
        userId: session.user.id,
        vercelProjectId: result.project.id,
        vercelProjectName,
      })
      .returning();
  }

  return {
    id: savedWorkflow.id,
    nodes: savedWorkflow.nodes as WorkflowNode[],
    edges: savedWorkflow.edges as WorkflowEdge[],
  };
}
