import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { SendGridCredentials } from "../credentials";

const SENDGRID_API_URL = "https://api.sendgrid.com";

type SendGridEmailResponse = {
  message_id: string;
};

type SendGridErrorResponse = {
  errors: Array<{
    message: string;
    field?: string;
    help?: string;
  }>;
};

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type SendEmailCoreInput = {
  emailFrom?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  emailCc?: string;
  emailBcc?: string;
  emailReplyTo?: string;
};

export type SendEmailInput = StepInput &
  SendEmailCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SendEmailCoreInput,
  credentials: SendGridCredentials,
  useKeeperHubApiKey: boolean
): Promise<SendEmailResult> {
  // Determine which API key to use
  let apiKey: string | undefined;
  
  if (useKeeperHubApiKey) {
    // Use KeeperHub API key from environment
    apiKey = process.env.SENDGRID_API_KEY;
  } else {
    // Use user's own API key from credentials
    apiKey = credentials.SENDGRID_API_KEY;
  }

  if (!apiKey) {
    return {
      success: false,
      error: useKeeperHubApiKey
        ? "SENDGRID_API_KEY is not configured in environment variables."
        : "SENDGRID_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  // Use FROM_ADDRESS from environment variables, fallback to default
  const fromAddress = process.env.FROM_ADDRESS || "noreply@keeperhub.com";

  try {
    const personalizations = [
      {
        to: [{ email: input.emailTo }],
        ...(input.emailCc && { cc: input.emailCc.split(",").map((email) => ({ email: email.trim() })) }),
        ...(input.emailBcc && { bcc: input.emailBcc.split(",").map((email) => ({ email: email.trim() })) }),
        subject: input.emailSubject,
      },
    ];

    const emailData = {
      personalizations,
      from: { email: fromAddress },
      content: [
        {
          type: "text/plain",
          value: input.emailBody,
        },
      ],
      ...(input.emailReplyTo && { reply_to: { email: input.emailReplyTo } }),
    };

    const response = await fetch(`${SENDGRID_API_URL}/v3/mail/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as SendGridErrorResponse;
      const errorMessage =
        errorData.errors && errorData.errors.length > 0
          ? errorData.errors.map((e) => e.message).join(", ")
          : `HTTP ${response.status}: Failed to send email`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    // SendGrid doesn't return a message ID in the response, so we generate one
    const messageId = `sg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return { success: true, id: messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to send email: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function sendEmailStep(
  input: SendEmailInput
): Promise<SendEmailResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  // Fetch integration config to check useKeeperHubApiKey
  let useKeeperHubApiKey = true; // Default to true
  if (input.integrationId) {
    const { getIntegrationById } = await import("@/lib/db/integrations");
    const integration = await getIntegrationById(input.integrationId);
    if (integration?.config) {
      const useKeeperHubValue = integration.config.useKeeperHubApiKey;
      useKeeperHubApiKey =
        useKeeperHubValue === true || useKeeperHubValue === "true";
    }
  }

  const coreInput: SendEmailCoreInput = {
    ...input,
  };

  return withStepLogging(input, () =>
    stepHandler(coreInput, credentials, useKeeperHubApiKey)
  );
}
sendEmailStep.maxRetries = 0;

// Export marker for codegen auto-generation
export const _integrationType = "sendgrid";

