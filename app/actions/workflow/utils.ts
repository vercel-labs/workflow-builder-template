"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";

const CURRENT_WORKFLOW_NAME = "__current__";

// Get session helper
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

// Verify workflow ownership
export async function verifyWorkflowOwnership(
  workflowId: string,
  userId: string
) {
  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), eq(workflows.userId, userId)),
  });

  if (!workflow) {
    throw new Error("Workflow not found");
  }

  return workflow;
}

export { CURRENT_WORKFLOW_NAME };
