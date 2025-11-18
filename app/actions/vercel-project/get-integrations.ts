"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getEnvironmentVariables } from "@/lib/integrations/vercel";

export type ProjectIntegrations = {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  aiGatewayApiKey: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
  hasAiGatewayKey: boolean;
};

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
    // Return empty integrations if no Vercel token
    return {
      resendApiKey: null,
      resendFromEmail: null,
      linearApiKey: null,
      slackApiKey: null,
      aiGatewayApiKey: null,
      hasResendKey: false,
      hasLinearKey: false,
      hasSlackKey: false,
      hasAiGatewayKey: false,
    };
  }

  // Fetch environment variables from Vercel
  const envResult = await getEnvironmentVariables({
    projectId: project.vercelProjectId,
    apiToken: vercelApiToken,
    teamId: vercelTeamId || undefined,
    decrypt: true, // Decrypt encrypted environment variables
  });

  if (envResult.status === "error" || !envResult.envs) {
    return {
      resendApiKey: null,
      resendFromEmail: null,
      linearApiKey: null,
      slackApiKey: null,
      aiGatewayApiKey: null,
      hasResendKey: false,
      hasLinearKey: false,
      hasSlackKey: false,
      hasAiGatewayKey: false,
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
  const aiGatewayApiKey =
    envResult.envs.find((env) => env.key === "AI_GATEWAY_API_KEY")?.value ||
    null;

  console.log(
    "[DEBUG] AI_GATEWAY_API_KEY:",
    aiGatewayApiKey ? `${aiGatewayApiKey.substring(0, 10)}...` : "null"
  );

  return {
    resendApiKey,
    resendFromEmail,
    linearApiKey,
    slackApiKey,
    aiGatewayApiKey,
    hasResendKey: !!resendApiKey,
    hasLinearKey: !!linearApiKey,
    hasSlackKey: !!slackApiKey,
    hasAiGatewayKey: !!aiGatewayApiKey,
  };
}
