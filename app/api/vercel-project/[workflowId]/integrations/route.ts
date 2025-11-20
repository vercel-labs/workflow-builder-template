import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getEnvironmentVariables } from "@/lib/integrations/vercel";

export type ProjectIntegrations = {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  aiGatewayApiKey: string | null;
  databaseUrl: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
  hasAiGatewayKey: boolean;
  hasDatabaseUrl: boolean;
};

/**
 * Mask an API key, showing only the last 4 characters
 * Example: "sk_live_abc123def456" -> "********def456"
 */
function maskApiKey(key: string | null): string | null {
  if (!key || key.length === 0) {
    return null;
  }

  if (key.length <= 4) {
    return "****";
  }

  const last4 = key.slice(-4);
  const stars = "*".repeat(Math.min(8, key.length - 4));
  return `${stars}${last4}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Get app-level Vercel credentials from env vars
    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelApiToken) {
      // Return empty integrations if no Vercel token
      return NextResponse.json({
        resendApiKey: null,
        resendFromEmail: null,
        linearApiKey: null,
        slackApiKey: null,
        aiGatewayApiKey: null,
        databaseUrl: null,
        hasResendKey: false,
        hasLinearKey: false,
        hasSlackKey: false,
        hasAiGatewayKey: false,
        hasDatabaseUrl: false,
      } as ProjectIntegrations);
    }

    // Fetch environment variables from Vercel
    const envResult = await getEnvironmentVariables({
      projectId: workflow.vercelProjectId,
      apiToken: vercelApiToken,
      teamId: vercelTeamId || undefined,
      decrypt: true, // Decrypt encrypted environment variables
    });

    if (envResult.status === "error" || !envResult.envs) {
      return NextResponse.json({
        resendApiKey: null,
        resendFromEmail: null,
        linearApiKey: null,
        slackApiKey: null,
        aiGatewayApiKey: null,
        databaseUrl: null,
        hasResendKey: false,
        hasLinearKey: false,
        hasSlackKey: false,
        hasAiGatewayKey: false,
        hasDatabaseUrl: false,
      } as ProjectIntegrations);
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
    const databaseUrl =
      envResult.envs.find((env) => env.key === "DATABASE_URL")?.value || null;

    // Mask API keys before returning them to the client
    // Only show last 4 characters for security
    return NextResponse.json({
      resendApiKey: maskApiKey(resendApiKey),
      resendFromEmail, // Email is not sensitive, don't mask
      linearApiKey: maskApiKey(linearApiKey),
      slackApiKey: maskApiKey(slackApiKey),
      aiGatewayApiKey: maskApiKey(aiGatewayApiKey),
      databaseUrl: maskApiKey(databaseUrl), // Database URL contains password, mask it
      hasResendKey: !!resendApiKey,
      hasLinearKey: !!linearApiKey,
      hasSlackKey: !!slackApiKey,
      hasAiGatewayKey: !!aiGatewayApiKey,
      hasDatabaseUrl: !!databaseUrl,
    } as ProjectIntegrations);
  } catch (error) {
    console.error("Failed to get project integrations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project integrations",
      },
      { status: 500 }
    );
  }
}
