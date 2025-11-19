"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import type { SavedWorkflow } from "./types";
import { getSession } from "./utils";

/**
 * Get a specific workflow by ID
 */
export async function get(id: string): Promise<SavedWorkflow | null> {
  const session = await getSession();

  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
  });

  if (!workflow) {
    return null;
  }

  return {
    ...workflow,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    lastDeployedAt: workflow.lastDeployedAt?.toISOString() || null,
  } as SavedWorkflow;
}
