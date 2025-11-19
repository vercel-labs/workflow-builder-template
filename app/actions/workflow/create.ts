"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { createProject } from "@/lib/integrations/vercel";
import type { SavedWorkflow, WorkflowData } from "./types";
import { getSession } from "./utils";

// Helper function to create a default trigger node
function createDefaultTriggerNode() {
  return {
    id: nanoid(),
    type: "trigger" as const,
    position: { x: 0, y: 0 },
    data: {
      label: "Trigger",
      description: "Start your workflow",
      type: "trigger" as const,
      config: { triggerType: "Manual" },
      status: "idle" as const,
    },
  };
}

/**
 * Create a new workflow
 * Each workflow automatically gets its own Vercel project using format: workflow-builder-[workflowId]
 */
export async function create(
  data: Omit<WorkflowData, "id">
): Promise<SavedWorkflow> {
  const session = await getSession();

  if (!(data.name && data.nodes && data.edges)) {
    throw new Error("Name, nodes, and edges are required");
  }

  // Ensure there's always a trigger node (only add one if nodes array is empty)
  let nodes = data.nodes;
  if (nodes.length === 0) {
    nodes = [createDefaultTriggerNode()];
  }

  // Generate "Untitled N" name if the provided name is "Untitled Workflow"
  let workflowName = data.name;
  if (data.name === "Untitled Workflow") {
    const userWorkflows = await db.query.workflows.findMany({
      where: eq(workflows.userId, session.user.id),
    });
    const count = userWorkflows.length + 1;
    workflowName = `Untitled ${count}`;
  }

  // Generate workflow ID first
  const workflowId = nanoid();

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

  const [newWorkflow] = await db
    .insert(workflows)
    .values({
      id: workflowId,
      name: workflowName,
      description: data.description,
      nodes,
      edges: data.edges,
      userId: session.user.id,
      vercelProjectId: result.project.id,
      vercelProjectName,
    })
    .returning();

  return {
    ...newWorkflow,
    createdAt: newWorkflow.createdAt.toISOString(),
    updatedAt: newWorkflow.updatedAt.toISOString(),
    lastDeployedAt: newWorkflow.lastDeployedAt?.toISOString() || null,
  } as SavedWorkflow;
}
