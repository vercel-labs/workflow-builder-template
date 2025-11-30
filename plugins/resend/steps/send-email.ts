import "server-only";

import { nanoid } from "nanoid";
import { Resend } from "resend";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type SendEmailInput = StepInput & {
  integrationId?: string;
  emailFrom?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  emailCc?: string;
  emailBcc?: string;
  emailReplyTo?: string;
  emailScheduledAt?: string;
  emailTopicId?: string;
};

/**
 * Send email logic - separated for clarity and testability
 */
async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

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
      {
        idempotencyKey: nanoid(),
      }
    );

    if (result.error) {
      return {
        success: false,
        error: result.error.message || "Failed to send email",
      };
    }

    return { success: true, id: result.data?.id || "" };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send email: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Send Email Step
 * Sends an email using Resend
 */
export async function sendEmailStep(
  input: SendEmailInput
): Promise<SendEmailResult> {
  "use step";
  return withStepLogging(input, () => sendEmail(input));
}
