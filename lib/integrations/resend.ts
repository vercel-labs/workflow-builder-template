import "server-only";
import { Resend } from "resend";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  from?: string;
  html?: string;
  apiKey: string;
  fromEmail?: string;
}

export interface SendEmailResult {
  status: "success" | "error";
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    if (!params.apiKey) {
      return {
        status: "error",
        error: "Resend API key not configured",
      };
    }

    const resend = new Resend(params.apiKey);

    const { data, error } = await resend.emails.send({
      from: params.from || params.fromEmail || "onboarding@resend.dev",
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      text: params.body,
      html: params.html || params.body,
    });

    if (error) {
      return {
        status: "error",
        error: error.message,
      };
    }

    return {
      status: "success",
      id: data?.id,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate email content using AI
 */
export async function generateEmail(params: {
  name: string;
  plan?: string;
  context?: string;
}): Promise<{ subject: string; body: string }> {
  // This could integrate with OpenAI or another LLM
  // For now, return a template-based approach
  const { name, plan = "Free", context = "welcome" } = params;

  if (context === "welcome") {
    return {
      subject: `Welcome to our platform, ${name}!`,
      body: `Hi ${name},\n\nWelcome to our platform! We're excited to have you on the ${plan} plan.\n\nGet started by exploring our features and let us know if you need any help.\n\nBest regards,\nThe Team`,
    };
  }

  return {
    subject: `Hello ${name}`,
    body: `Hi ${name},\n\nThank you for using our service.\n\nBest regards,\nThe Team`,
  };
}
