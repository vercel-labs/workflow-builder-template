import "server-only";

import { Resend } from "resend";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ResendCredentials } from "../credentials";

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
  emailScheduledAt?: string;
  emailTopicId?: string;
  idempotencyKey?: string;
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
  credentials: ResendCredentials
): Promise<SendEmailResult> {
  const apiKey = credentials.RESEND_API_KEY;
  const fromEmail = credentials.RESEND_FROM_EMAIL;

  if (!apiKey) {
    return {
      success: false,
      error:
        "RESEND_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const senderEmail = input.emailFrom || fromEmail;

  if (!senderEmail) {
    return {
      success: false,
      error:
        "No sender is configured. Please add it in the action or in Project Integrations.",
    };
  }

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send(
      {
        from: senderEmail,
        to: input.emailTo,
        subject: input.emailSubject,
        text: input.emailBody,
        ...(input.emailCc && { cc: input.emailCc }),
        ...(input.emailBcc && { bcc: input.emailBcc }),
        ...(input.emailReplyTo && { replyTo: input.emailReplyTo }),
        ...(input.emailScheduledAt && { scheduledAt: input.emailScheduledAt }),
        ...(input.emailTopicId && { topicId: input.emailTopicId }),
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );

    if (result.error) {
      return {
        success: false,
        error: result.error.message || "Failed to send email",
      };
    }

    return { success: true, id: result.data?.id || "" };
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

  const coreInput: SendEmailCoreInput = {
    ...input,
    idempotencyKey: input._context?.executionId,
  };

  return withStepLogging(input, () => stepHandler(coreInput, credentials));
}

// Export marker for codegen auto-generation
export const _integrationType = "resend";
