/**
 * Shared utilities for workflow server actions
 */
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";

// Get session helper (requires authentication)
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
