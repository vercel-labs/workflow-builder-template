"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { setEnvironmentVariable } from "@/lib/integrations/vercel";

export type UpdateProjectIntegrationsInput = {
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  linearApiKey?: string | null;
  slackApiKey?: string | null;
  aiGatewayApiKey?: string | null;
  databaseUrl?: string | null;
};

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

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, session.user.id)
    ),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Get app-level Vercel credentials from env vars
  const vercelApiToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelApiToken) {
    throw new Error("Vercel API token not configured");
  }

  // Update environment variables in Vercel
  const envUpdates: Array<{ key: string; value: string }> = [];

  const keyValuePairs: Array<{
    key: string;
    value: string | null | undefined;
  }> = [
    { key: "RESEND_API_KEY", value: data.resendApiKey },
    { key: "RESEND_FROM_EMAIL", value: data.resendFromEmail },
    { key: "LINEAR_API_KEY", value: data.linearApiKey },
    { key: "SLACK_API_KEY", value: data.slackApiKey },
    { key: "AI_GATEWAY_API_KEY", value: data.aiGatewayApiKey },
    { key: "DATABASE_URL", value: data.databaseUrl },
  ];

  for (const { key, value } of keyValuePairs) {
    if (value !== undefined && value) {
      envUpdates.push({ key, value });
    }
  }

  // Set environment variables in Vercel
  for (const { key, value } of envUpdates) {
    const result = await setEnvironmentVariable({
      projectId: project.vercelProjectId,
      apiToken: vercelApiToken,
      teamId: vercelTeamId || undefined,
      key,
      value,
      type: "encrypted", // Use "encrypted" for maximum security
    });

    if (result.status === "error") {
      throw new Error(`Failed to set ${key}: ${result.error}`);
    }
  }

  // Update the project's updatedAt timestamp
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    );
}
