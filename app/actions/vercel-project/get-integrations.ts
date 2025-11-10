"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, user } from "@/lib/db/schema";
import { getEnvironmentVariables } from "@/lib/integrations/vercel";

export interface ProjectIntegrations {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
}

export async function getProjectIntegrations(
  projectId: string
): Promise<ProjectIntegrations> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Get user's Vercel API token
  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      vercelApiToken: true,
      vercelTeamId: true,
    },
  });

  if (!userData?.vercelApiToken) {
    // Return empty integrations if no Vercel token
    return {
      resendApiKey: null,
      resendFromEmail: null,
      linearApiKey: null,
      slackApiKey: null,
      hasResendKey: false,
      hasLinearKey: false,
      hasSlackKey: false,
    };
  }

  // Fetch environment variables from Vercel
  const envResult = await getEnvironmentVariables({
    projectId: project.vercelProjectId,
    apiToken: userData.vercelApiToken,
    teamId: userData.vercelTeamId || undefined,
  });

  if (envResult.status === "error" || !envResult.envs) {
    return {
      resendApiKey: null,
      resendFromEmail: null,
      linearApiKey: null,
      slackApiKey: null,
      hasResendKey: false,
      hasLinearKey: false,
      hasSlackKey: false,
    };
  }

  // Extract integration keys from environment variables
  const resendApiKey =
    envResult.envs.find((env) => env.key === "RESEND_API_KEY")?.value || null;
  const resendFromEmail =
    envResult.envs.find((env) => env.key === "RESEND_FROM_EMAIL")?.value ||
    null;
  const linearApiKey =
    envResult.envs.find((env) => env.key === "LINEAR_API_KEY")?.value || null;
  const slackApiKey =
    envResult.envs.find((env) => env.key === "SLACK_API_KEY")?.value || null;

  return {
    resendApiKey,
    resendFromEmail,
    linearApiKey,
    slackApiKey,
    hasResendKey: !!resendApiKey,
    hasLinearKey: !!linearApiKey,
    hasSlackKey: !!slackApiKey,
  };
}

