/**
 * Step input enricher - adds API keys and credentials to step inputs
 * For test runs: uses user's stored credentials
 * For production: uses system environment variables
 */

export type CredentialSource = "user" | "system";

export type EnvVarConfig = {
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_ID?: string;
  RESEND_API_KEY?: string;
  SLACK_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DATABASE_URL?: string;
};

/**
 * Get credentials based on source
 */
export function getCredentials(
  source: CredentialSource,
  userEnvVars?: EnvVarConfig
): EnvVarConfig {
  if (source === "user" && userEnvVars) {
    return userEnvVars;
  }

  // For production, use system environment variables
  return {
    LINEAR_API_KEY: process.env.LINEAR_API_KEY,
    LINEAR_TEAM_ID: process.env.LINEAR_TEAM_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SLACK_API_KEY: process.env.SLACK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };
}

/**
 * Enrich step input with necessary credentials based on action type
 */
export function enrichStepInput(
  actionType: string,
  input: Record<string, unknown>,
  credentials: EnvVarConfig
): Record<string, unknown> {
  const enrichedInput = { ...input };

  switch (actionType) {
    case "Create Ticket":
    case "Find Issues":
      if (credentials.LINEAR_API_KEY) {
        enrichedInput.apiKey = credentials.LINEAR_API_KEY;
      }
      if (credentials.LINEAR_TEAM_ID) {
        enrichedInput.teamId = credentials.LINEAR_TEAM_ID;
      }
      break;

    case "Send Email":
      if (credentials.RESEND_API_KEY) {
        enrichedInput.apiKey = credentials.RESEND_API_KEY;
      }
      break;

    case "Send Slack Message":
      if (credentials.SLACK_API_KEY) {
        enrichedInput.apiKey = credentials.SLACK_API_KEY;
      }
      break;

    case "Generate Text":
    case "Generate Image":
      if (credentials.OPENAI_API_KEY) {
        enrichedInput.apiKey = credentials.OPENAI_API_KEY;
      }
      break;

    case "Database Query":
      if (credentials.DATABASE_URL) {
        enrichedInput.databaseUrl = credentials.DATABASE_URL;
      }
      break;

    // HTTP Request and Condition don't need credentials
    default:
      break;
  }

  return enrichedInput;
}
