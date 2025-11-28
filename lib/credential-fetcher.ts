/**
 * Credential Fetcher
 *
 * SECURITY: Steps should fetch credentials at runtime using only an integration ID reference.
 * This ensures:
 * 1. Credentials are never passed as step parameters (not logged in observability)
 * 2. Credentials are reconstructed in secure, non-persisted contexts (in-memory only)
 * 3. Works for both production and test runs
 *
 * Pattern:
 * - Step input: { integrationId: "abc123", ...otherParams }  ← Safe to log
 * - Step fetches: credentials = await fetchCredentials(integrationId)  ← Not logged
 * - Step uses: apiClient.call(credentials.apiKey)  ← In memory only
 * - Step returns: { result: data }  ← Safe to log (no credentials)
 */
import "server-only";

import { getIntegrationById, type IntegrationConfig } from "./db/integrations";

export type WorkflowCredentials = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_ID?: string;
  SLACK_API_KEY?: string;
  AI_GATEWAY_API_KEY?: string;
  DATABASE_URL?: string;
  FIRECRAWL_API_KEY?: string;
  V0_API_KEY?: string;
  CLERK_SECRET_KEY?: string;
};

function mapResendConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.apiKey) {
    creds.RESEND_API_KEY = config.apiKey;
  }
  if (config.fromEmail) {
    creds.RESEND_FROM_EMAIL = config.fromEmail;
  }
  return creds;
}

function mapLinearConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.apiKey) {
    creds.LINEAR_API_KEY = config.apiKey;
  }
  if (config.teamId) {
    creds.LINEAR_TEAM_ID = config.teamId;
  }
  return creds;
}

function mapSlackConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.apiKey) {
    creds.SLACK_API_KEY = config.apiKey;
  }
  return creds;
}

function mapDatabaseConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.url) {
    creds.DATABASE_URL = config.url;
  }
  return creds;
}

function mapAiGatewayConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.apiKey) {
    creds.AI_GATEWAY_API_KEY = config.apiKey;
  }
  return creds;
}

function mapFirecrawlConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.firecrawlApiKey) {
    creds.FIRECRAWL_API_KEY = config.firecrawlApiKey;
  }
  return creds;
}

function mapV0Config(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.apiKey) {
    creds.V0_API_KEY = config.apiKey;
  }
  return creds;
}

function mapClerkConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.clerkSecretKey) {
    creds.CLERK_SECRET_KEY = config.clerkSecretKey;
  }
  return creds;
}

/**
 * Map integration config to WorkflowCredentials format
 */
function mapIntegrationConfig(
  integrationType: string,
  config: IntegrationConfig
): WorkflowCredentials {
  if (integrationType === "resend") {
    return mapResendConfig(config);
  }
  if (integrationType === "linear") {
    return mapLinearConfig(config);
  }
  if (integrationType === "slack") {
    return mapSlackConfig(config);
  }
  if (integrationType === "database") {
    return mapDatabaseConfig(config);
  }
  if (integrationType === "ai-gateway") {
    return mapAiGatewayConfig(config);
  }
  if (integrationType === "firecrawl") {
    return mapFirecrawlConfig(config);
  }
  if (integrationType === "v0") {
    return mapV0Config(config);
  }
  if (integrationType === "clerk") {
    return mapClerkConfig(config);
  }
  return {};
}

/**
 * Fetch credentials for an integration by ID
 *
 * @param integrationId - The ID of the integration to fetch credentials for
 * @returns WorkflowCredentials object with the integration's credentials
 */
export async function fetchCredentials(
  integrationId: string
): Promise<WorkflowCredentials> {
  console.log("[Credential Fetcher] Fetching integration:", integrationId);

  const integration = await getIntegrationById(integrationId);

  if (!integration) {
    console.log("[Credential Fetcher] Integration not found");
    return {};
  }

  console.log("[Credential Fetcher] Found integration:", integration.type);

  const credentials = mapIntegrationConfig(
    integration.type,
    integration.config
  );

  console.log(
    "[Credential Fetcher] Returning credentials for type:",
    integration.type
  );

  return credentials;
}

/**
 * Legacy function name for backward compatibility
 * Now fetches by integration ID instead of workflow ID
 */
export function fetchIntegrationCredentials(
  integrationId: string
): Promise<WorkflowCredentials> {
  return fetchCredentials(integrationId);
}
