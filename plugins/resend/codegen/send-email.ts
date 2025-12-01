/**
 * Code generation template for Send Email action
 * Used when exporting workflows to standalone Next.js projects
 */
export const sendEmailCodegenTemplate = `import { Resend } from 'resend';

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function sendEmailStep(input: {
  executionId?: string;
  emailFrom?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  emailCc?: string;
  emailBcc?: string;
  emailReplyTo?: string;
  emailScheduledAt?: string;
  emailTopicId?: string;
}): Promise<SendEmailResult> {
  "use step";

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured.',
    };
  }

  const senderEmail = input.emailFrom || process.env.RESEND_FROM_EMAIL;

  if (!senderEmail) {
    return {
      success: false,
      error: 'From email is not configured. Please set emailFrom or RESEND_FROM_EMAIL env var.',
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
      input.executionId ? { idempotencyKey: input.executionId } : undefined
    );

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return { success: true, id: result.data?.id || '' };
  } catch (error) {
    return {
      success: false,
      error: \`Failed to send email: \${error instanceof Error ? error.message : String(error)}\`,
    };
  }
}`;
