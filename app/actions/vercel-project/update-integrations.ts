"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export interface UpdateProjectIntegrationsInput {
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  linearApiKey?: string | null;
  slackApiKey?: string | null;
}

export async function updateProjectIntegrations(
  projectId: string,
  data: UpdateProjectIntegrationsInput
): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.resendApiKey !== undefined) {
    updateData.resendApiKey = data.resendApiKey || null;
  }
  if (data.resendFromEmail !== undefined) {
    updateData.resendFromEmail = data.resendFromEmail || null;
  }
  if (data.linearApiKey !== undefined) {
    updateData.linearApiKey = data.linearApiKey || null;
  }
  if (data.slackApiKey !== undefined) {
    updateData.slackApiKey = data.slackApiKey || null;
  }

  await db
    .update(projects)
    .set(updateData)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));
}

