/**
 * Executable step function for Send Email action
 */
import "server-only";

import { Resend } from "resend";

export async function sendEmailStep(input: {
  fromEmail: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  apiKey: string;
}) {
  "use step";

  const resend = new Resend(input.apiKey);

  const result = await resend.emails.send({
    from: input.fromEmail,
    to: input.emailTo,
    subject: input.emailSubject,
    text: input.emailBody,
  });

  return result;
}
