"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
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

  // Check if workflow has Vercel project
  if (!workflow.vercelProjectId) {
    throw new Error("This workflow is not linked to a Vercel project.");
  }

  // Update status to deploying
  await db
    .update(workflows)
    .set({ deploymentStatus: "deploying" })
    .where(eq(workflows.id, id));

  // Deploy workflow
  const result = await deployWorkflowToVercel({
    workflows: [
      {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
    ],
    vercelToken: vercelApiToken,
    vercelTeamId,
    vercelProjectId: workflow.vercelProjectId,
  });

  // Update workflow with deployment result
  await db
    .update(workflows)
    .set({
      deploymentStatus: result.success ? "deployed" : "failed",
      deploymentUrl: result.deploymentUrl,
      lastDeployedAt: new Date(),
    })
    .where(eq(workflows.id, id));

  return {
    success: result.success,
    deploymentUrl: result.deploymentUrl,
    error: result.error,
    logs: result.logs,
  };
}
