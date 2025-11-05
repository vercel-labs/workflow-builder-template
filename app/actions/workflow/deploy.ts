"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, vercelProjects, workflows } from "@/lib/db/schema";
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

  // Get user's Vercel credentials
  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      vercelApiToken: true,
      vercelTeamId: true,
    },
  });

  if (!userData?.vercelApiToken) {
    throw new Error(
      "Vercel API token not configured. Please configure in settings."
    );
  }

  // Check if workflow is linked to a Vercel project
  if (!workflow.vercelProjectId) {
    throw new Error(
      'This workflow is not linked to a Vercel project. Please link it to a project first using the "Change Project" option.'
    );
  }

  // Get the actual Vercel project to verify it's a real Vercel project
  const vercelProject = await db.query.vercelProjects.findFirst({
    where: eq(vercelProjects.id, workflow.vercelProjectId),
  });

  if (!vercelProject) {
    throw new Error(
      "Linked Vercel project not found. Please link this workflow to a valid project."
    );
  }

  // Check if it's a local (fake) project
  if (vercelProject.vercelProjectId.startsWith("local-")) {
    throw new Error(
      "This workflow is linked to a local project that does not exist on Vercel. " +
        "Please configure your Vercel API token in settings, then create a new Vercel project or link to an existing one."
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
    vercelToken: userData.vercelApiToken,
    vercelTeamId: userData.vercelTeamId || undefined,
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
