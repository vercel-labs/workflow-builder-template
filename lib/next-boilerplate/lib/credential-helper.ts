/**
 * Credential Helper for Exported Workflows
 *
 * This module provides a fetchCredentials function that reads credentials
 * from environment variables. It mirrors the app's fetchCredentials API
 * but uses env vars instead of database lookups.
 *
 * Integration types map to their env vars via a registry that gets generated
 * at export time based on the plugins used in the workflow.
 */

/**
 * Credential mapping for each integration type
 * Maps integration type -> { envVarName: envVarKey }
 *
 * This is generated at export time by the workflow exporter
 * and injected into the exported project.
 */
export const INTEGRATION_ENV_VARS: Record<string, Record<string, string>> = {
  resend: {
    RESEND_API_KEY: "RESEND_API_KEY",
    RESEND_FROM_EMAIL: "RESEND_FROM_EMAIL",
  },
  // Additional integrations will be added at export time
};

/**
 * Fetch credentials for an integration by its type
 *
 * In exported workflows, integrationId is the integration type (e.g., "resend")
 * This function reads the corresponding environment variables and returns them
 * in the same format as the app's fetchCredentials function.
 *
 * Note: This function is async to match the app's fetchCredentials signature,
 * allowing step code to use the same API in both contexts.
 *
 * @param integrationType - The integration type (e.g., "resend", "slack")
 * @returns A record of credential values keyed by their env var names
 */
export function fetchCredentials(
  integrationType: string
): Promise<Record<string, string | undefined>> {
  const envVarMapping = INTEGRATION_ENV_VARS[integrationType];

  if (!envVarMapping) {
    console.warn(
      `[Credential Helper] Unknown integration type: ${integrationType}`
    );
    return Promise.resolve({});
  }

  const credentials: Record<string, string | undefined> = {};

  for (const [credKey, envVarName] of Object.entries(envVarMapping)) {
    credentials[credKey] = process.env[envVarName];
  }

  return Promise.resolve(credentials);
}
