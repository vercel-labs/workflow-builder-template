"use server";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import type { SavedWorkflow } from "./types";

/**
 * Get all workflows for the current user
 */
export async function getAll(): Promise<SavedWorkflow[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const userWorkflows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, session.user.id))
    .orderBy(desc(workflows.updatedAt));

  return userWorkflows as SavedWorkflow[];
}
