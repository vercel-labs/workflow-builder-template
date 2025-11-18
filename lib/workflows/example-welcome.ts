/**
 * Generated Workflow: Welcome Email Workflow
 *
 * This is an example of what a generated workflow looks like.
 * In production, this would be auto-generated from the workflow builder.
 */

import { generateEmail, sendEmail } from "../integrations/resend";

type WelcomeInput = {
  email: string;
  name: string;
  plan: string;
  apiKey: string;
  fromEmail?: string;
};

/**
 * Welcome workflow that sends an onboarding email to a new user
 */
export async function welcome(input: WelcomeInput) {
  "use workflow";

  const { subject, body } = await generateEmail({
    name: input.name,
    plan: input.plan,
    context: "welcome",
  });

  const { status } = await sendEmail({
    to: input.email,
    subject,
    body,
    apiKey: input.apiKey,
    fromEmail: input.fromEmail,
  });

  return { status, subject, body };
}

/**
 * More complex example: User onboarding workflow
 */
export async function onboardUser(
  input: Record<string, unknown>,
  apiKey: string,
  fromEmail?: string
): Promise<unknown> {
  "use workflow";

  const email = input.email as string;
  const name = input.name as string;
  const plan = input.plan as string;

  // Condition: Check if user is on a paid plan
  if (plan !== "Free") {
    // Transform: Prepare welcome email data
    const emailData = {
      name,
      plan,
      context: "premium_welcome",
    };

    // Action: Generate and send premium welcome email
    const emailResponse = await generateEmail(emailData);
    const emailResult = await sendEmail({
      to: email,
      subject: emailResponse.subject,
      body: emailResponse.body,
      apiKey,
      fromEmail,
    });

    return emailResult;
  }
  // Action: Send basic welcome email for free users
  const basicEmailResponse = await generateEmail({
    name,
    plan: "Free",
    context: "welcome",
  });

  const emailResult = await sendEmail({
    to: email,
    subject: basicEmailResponse.subject,
    body: basicEmailResponse.body,
    apiKey,
    fromEmail,
  });

  return emailResult;
}
