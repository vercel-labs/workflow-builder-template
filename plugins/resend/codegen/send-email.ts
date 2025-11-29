/**
 * Code generation template for Send Email action
 * Used when exporting workflows to standalone Next.js projects
 */
export const sendEmailCodegenTemplate = `import { Resend } from 'resend';

export async function sendEmailStep(input: {
  emailFrom?: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  emailCc?: string;
  emailBcc?: string;
  emailReplyTo?: string;
  emailScheduledAt?: string;
  emailTopicId?: string;
}) {
  "use step";

  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: input.emailFrom || process.env.RESEND_FROM_EMAIL,
    to: input.emailTo,
    subject: input.emailSubject,
    text: input.emailBody,
    ...(input.emailCc && { cc: input.emailCc }),
    ...(input.emailBcc && { bcc: input.emailBcc }),
    ...(input.emailReplyTo && { replyTo: input.emailReplyTo }),
    ...(input.emailScheduledAt && { scheduledAt: input.emailScheduledAt }),
    ...(input.emailTopicId && { topicId: input.emailTopicId }),
  });

  return result;
}`;

