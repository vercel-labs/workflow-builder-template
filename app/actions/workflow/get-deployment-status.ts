"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession } from "./utils";

/**
 * Get deployment status for a workflow
 */
export async function getDeploymentStatus(id: string): Promise<{
  id: string;
  name: string;
  deploymentStatus: string;
  deploymentUrl?: string | null;
  lastDeployedAt?: Date | null;
}> {
  const session = await getSession();

  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
    columns: {
      id: true,
      name: true,
      deploymentStatus: true,
      deploymentUrl: true,
      lastDeployedAt: true,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return {
    id: workflow.id,
    name: workflow.name,
    deploymentStatus: workflow.deploymentStatus || "none",
    deploymentUrl: workflow.deploymentUrl,
    lastDeployedAt: workflow.lastDeployedAt,
  };
}
