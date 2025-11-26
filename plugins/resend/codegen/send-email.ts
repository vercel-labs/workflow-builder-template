/**
 * Code generation template for Send Email action
 * Used when exporting workflows to standalone Next.js projects
 */
export const sendEmailCodegenTemplate = `import { Resend } from 'resend';

export async function sendEmailStep(input: {
  fromEmail: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
}) {
  "use step";
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const result = await resend.emails.send({
    from: input.fromEmail,
    to: input.emailTo,
    subject: input.emailSubject,
    text: input.emailBody,
  });
  
  return result;
}`;

