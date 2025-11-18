/**
 * Executable step function for Send Email action
 */
import { Resend } from "resend";

export async function sendEmailStep(input: {
  fromEmail: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  apiKey: string;
}) {
  const resend = new Resend(input.apiKey);

  const result = await resend.emails.send({
    from: input.fromEmail,
    to: input.emailTo,
    subject: input.emailSubject,
    text: input.emailBody,
  });

  console.log("Email sent:", result);
  return result;
}
