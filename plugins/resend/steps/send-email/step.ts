import "server-only";

import { Resend } from "resend";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { withStepLogging, type StepInput } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type SendEmailInput = StepInput & {
  integrationId?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
};

/**
 * Send Email Step
 * Sends an email using Resend
 */
export async function sendEmailStep(
  input: SendEmailInput
): Promise<SendEmailResult> {
  "use step";

  return withStepLogging(input, async () => {
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

    if (!fromEmail) {
      return {
        success: false,
        error:
          "RESEND_FROM_EMAIL is not configured. Please add it in Project Integrations.",
      };
    }

    try {
      const resend = new Resend(apiKey);

      const result = await resend.emails.send({
        from: fromEmail,
        to: input.emailTo,
        subject: input.emailSubject,
        text: input.emailBody,
      });

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
  });
}
