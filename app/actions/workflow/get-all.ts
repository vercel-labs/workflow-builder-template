"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getSession } from "./utils";
import type { SavedWorkflow } from "./types";

/**
 * Get all workflows for the current user
 */
export async function getAll(): Promise<SavedWorkflow[]> {
  const session = await getSession();

  const userWorkflows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, session.user.id))
    .orderBy(desc(workflows.updatedAt));

  return userWorkflows as SavedWorkflow[];
}
