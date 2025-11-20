/**
 * Credential Fetcher
 *
 * SECURITY: Steps should fetch credentials at runtime using only a workflow ID reference.
 * This ensures:
 * 1. Credentials are never passed as step parameters (not logged in observability)
 * 2. Credentials are reconstructed in secure, non-persisted contexts (in-memory only)
 * 3. Works for both production and test runs
 *
 * Pattern:
 * - Step input: { workflowId: "abc123", ...otherParams }  ← Safe to log
 * - Step fetches: credentials = await fetchCredentials(workflowId)  ← Not logged
 * - Step uses: apiClient.call(credentials.apiKey)  ← In memory only
 * - Step returns: { result: data }  ← Safe to log (no credentials)
 */
import "server-only";

import { eq } from "drizzle-orm";
import { db } from "./db";
import { workflows } from "./db/schema";
import { getEnvironmentVariables } from "./integrations/vercel";

export type WorkflowCredentials = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_ID?: string;
  SLACK_API_KEY?: string;
  AI_GATEWAY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DATABASE_URL?: string;
};

/**
 * Fetch credentials for a workflow
 *
 * IMPORTANT: For local/test runs, always fetch from Vercel API.
 * Process.env is only used when running as a deployed workflow on Vercel,
 * where each workflow has its own project with its own environment variables.
 */
export async function fetchWorkflowCredentials(
  workflowId: string
): Promise<WorkflowCredentials> {
  console.log(
    "[Credential Fetcher] Fetching credentials for workflow:",
    workflowId
  );

  // Always fetch from Vercel API (works for both test and production)
  // In production, the deployed workflow project will have these in process.env,
  // but for test runs we need to fetch them from the Vercel API
  console.log("[Credential Fetcher] Fetching from Vercel API");
  const vercelCredentials = await fetchCredentialsFromVercel(workflowId);
  console.log(
    "[Credential Fetcher] Vercel credentials available:",
    hasCredentials(vercelCredentials)
  );

  return vercelCredentials;
}

/**
 * Check if credentials object has any values
 */
function hasCredentials(creds: WorkflowCredentials): boolean {
  return Object.values(creds).some((value) => value && value.trim() !== "");
}

/**
 * Fetch credentials from Vercel API (test runs)
 */
async function fetchCredentialsFromVercel(
  workflowId: string
): Promise<WorkflowCredentials> {
  try {
    console.log(
      "[Credential Fetcher] Fetching workflow from database:",
      workflowId
    );

    // Get workflow to find Vercel project ID
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
      columns: {
        vercelProjectId: true,
      },
    });

    if (!workflow?.vercelProjectId) {
      console.log("[Credential Fetcher] No workflow or vercelProjectId found");
      return {};
    }

    console.log(
      "[Credential Fetcher] Found vercelProjectId:",
      workflow.vercelProjectId
    );

    // Get Vercel API credentials from system env
    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelApiToken) {
      console.log("[Credential Fetcher] No VERCEL_API_TOKEN in system env");
      return {};
    }

    console.log("[Credential Fetcher] Fetching env vars from Vercel API");

    // Fetch environment variables from Vercel
    const envResult = await getEnvironmentVariables({
      projectId: workflow.vercelProjectId,
      apiToken: vercelApiToken,
      teamId: vercelTeamId || undefined,
      decrypt: true,
    });

    console.log(
      "[Credential Fetcher] Vercel API result status:",
      envResult.status
    );

    if (envResult.status !== "success" || !envResult.envs) {
      console.log("[Credential Fetcher] Failed to fetch env vars from Vercel");
      return {};
    }

    console.log(
      "[Credential Fetcher] Found",
      envResult.envs.length,
      "env vars from Vercel"
    );

    // Extract credentials
    const envMap = new Map(envResult.envs.map((env) => [env.key, env.value]));

    const credentials = {
      RESEND_API_KEY: envMap.get("RESEND_API_KEY"),
      RESEND_FROM_EMAIL: envMap.get("RESEND_FROM_EMAIL"),
      LINEAR_API_KEY: envMap.get("LINEAR_API_KEY"),
      LINEAR_TEAM_ID: envMap.get("LINEAR_TEAM_ID"),
      SLACK_API_KEY: envMap.get("SLACK_API_KEY"),
      AI_GATEWAY_API_KEY: envMap.get("AI_GATEWAY_API_KEY"),
      OPENAI_API_KEY: envMap.get("OPENAI_API_KEY"),
      DATABASE_URL: envMap.get("DATABASE_URL"),
    };

    console.log(
      "[Credential Fetcher] Extracted credentials:",
      Object.keys(credentials).filter(
        (k) => credentials[k as keyof WorkflowCredentials]
      )
    );

    return credentials;
  } catch (error) {
    console.error("[Credential Fetcher] Error fetching credentials:", error);
    return {};
  }
}
