"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession } from "./utils";
import type { SavedWorkflow } from "./types";

/**
 * Get a specific workflow by ID
 */
export async function get(id: string): Promise<SavedWorkflow> {
  const session = await getSession();

  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
    with: {
      vercelProject: true,
    },
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return workflow as SavedWorkflow;
}
