/**
 * Generated Workflow: Welcome Email Workflow
 *
 * This is an example of what a generated workflow looks like.
 * In production, this would be auto-generated from the workflow builder.
 */

import { generateEmail, getUser, sendEmail } from "../integrations";

/**
 * Welcome workflow that sends an onboarding email to a new user
 */
export async function welcome(
  userId: string,
  apiKey: string,
  fromEmail?: string
) {
  "use workflow";

  const user = await getUser(userId);

  const { subject, body } = await generateEmail({
    name: user.name,
    plan: user.plan,
    context: "welcome",
  });

  const { status } = await sendEmail({
    to: user.email,
    subject,
    body,
    apiKey,
    fromEmail,
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

  // Action: Get user data
  const user = await getUser(input.userId as string);

  // Condition: Check if user is on a paid plan
  if (user.plan !== "Free") {
    // Transform: Prepare welcome email data
    const emailData = {
      name: user.name,
      plan: user.plan,
      context: "premium_welcome",
    };

    // Action: Generate and send premium welcome email
    const emailResponse = await generateEmail(emailData);
    const emailResult = await sendEmail({
      to: user.email,
      subject: emailResponse.subject,
      body: emailResponse.body,
      apiKey,
      fromEmail,
    });

    return emailResult;
  }
  // Action: Send basic welcome email for free users
  const basicEmailResponse = await generateEmail({
    name: user.name,
    plan: "Free",
    context: "welcome",
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: basicEmailResponse.subject,
    body: basicEmailResponse.body,
    apiKey,
    fromEmail,
  });

  return emailResult;
}
