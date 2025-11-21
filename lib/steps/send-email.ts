/**
 * Executable step function for Send Email action
 *
 * SECURITY PATTERN - External Secret Store:
 * - Step input contains only a REFERENCE (workflowId), not actual credentials
 * - Step fetches credentials internally using the reference
 * - Credentials are used in memory only
 * - Step output contains no credentials
 *
 * This ensures:
 * ✓ Credentials are never logged in Vercel's workflow observability
 * ✓ Works for both production (process.env) and test runs (Vercel API fetch)
 * ✓ Follows Vercel Workflow DevKit best practices
 */
import "server-only";

import { Resend } from "resend";
import { fetchCredentials } from "../credential-fetcher";

export async function sendEmailStep(input: {
  integrationId?: string; // Reference to fetch credentials (safe to log)
  emailTo: string;
  emailSubject: string;
  emailBody: string;
}) {
  "use step";

  console.log(
    "[Send Email] Step called with integrationId:",
    input.integrationId
  );

  // SECURITY: Fetch credentials using the integration ID reference
  // This happens in a secure, non-persisted context (not logged by observability)
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  console.log(
    "[Send Email] Credentials fetched, has API key:",
    !!credentials.RESEND_API_KEY
  );

  const apiKey = credentials.RESEND_API_KEY;
  const fromEmail = credentials.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured. Please add it in Project Integrations."
    );
  }

  // Use credentials in memory only
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: fromEmail,
    to: input.emailTo,
    subject: input.emailSubject,
    text: input.emailBody,
  });

  // Return result WITHOUT credentials (safe to log)
  return result;
}
