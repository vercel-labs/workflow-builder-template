"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vercelProjects, workflows } from "@/lib/db/schema";
import { deployWorkflowToVercel } from "@/lib/vercel-deployment";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Deploy workflow to Vercel
 */
export async function deploy(id: string): Promise<{
  success: boolean;
  deploymentUrl?: string;
  error?: string;
  logs?: string[];
}> {
  const session = await getSession();
  const workflow = await verifyWorkflowOwnership(id, session.user.id);

  // Get app-level Vercel credentials
  const vercelApiToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelApiToken) {
    throw new Error("Vercel API token not configured");
  }

  // Check if workflow is linked to a Vercel project
  if (!workflow.vercelProjectId) {
    throw new Error(
      'This workflow is not linked to a Vercel project. Please link it to a project first using the "Change Project" option.'
    );
  }

  // Get the actual Vercel project
  const vercelProject = await db.query.vercelProjects.findFirst({
    where: eq(vercelProjects.id, workflow.vercelProjectId),
  });

  if (!vercelProject) {
    throw new Error(
      "Linked Vercel project not found. Please link this workflow to a valid project."
    );
  }

  // Get all workflows for this Vercel project
  const projectWorkflows = await db.query.workflows.findMany({
    where: and(
      eq(workflows.vercelProjectId, workflow.vercelProjectId!),
      eq(workflows.userId, session.user.id)
    ),
  });

  // Update status to deploying for all workflows in the project
  await db
    .update(workflows)
    .set({ deploymentStatus: "deploying" })
    .where(
      and(
        eq(workflows.vercelProjectId, workflow.vercelProjectId!),
        eq(workflows.userId, session.user.id)
      )
    );

  // Deploy all workflows in the project
  const result = await deployWorkflowToVercel({
    workflows: projectWorkflows.map((w) => ({
      id: w.id,
      name: w.name,
      nodes: w.nodes,
      edges: w.edges,
    })),
    vercelToken: vercelApiToken,
    vercelTeamId: vercelTeamId,
    vercelProjectId: vercelProject.vercelProjectId, // Use the actual Vercel project ID
  });

  // Update all workflows in the project with deployment result
  await db
    .update(workflows)
    .set({
      deploymentStatus: result.success ? "deployed" : "failed",
      deploymentUrl: result.deploymentUrl,
      lastDeployedAt: new Date(),
    })
    .where(
      and(
        eq(workflows.vercelProjectId, workflow.vercelProjectId!),
        eq(workflows.userId, session.user.id)
      )
    );

  return {
    success: result.success,
    deploymentUrl: result.deploymentUrl,
    error: result.error,
    logs: result.logs,
  };
}
