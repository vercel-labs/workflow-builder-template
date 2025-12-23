import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type EmailFinderResult =
  | { success: true; data: { email: string | null; email_status: string | null; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null } }
  | { success: false; error: { message: string } };

export type EmailFinderCoreInput = {
  profile_url: string;
};

export type EmailFinderInput = StepInput &
  EmailFinderCoreInput & {
    integrationId?: string;
  };

interface EmailFinderResponse {
  email?: string;
  email_status?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  [key: string]: unknown;
}

async function stepHandler(
  input: EmailFinderCoreInput,
  credentials: LeadMagicCredentials
): Promise<EmailFinderResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.profile_url) {
    return { success: false, error: { message: "LinkedIn profile URL is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/people/b2b-profile-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        profile_url: input.profile_url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as EmailFinderResponse;

    return {
      success: true,
      data: {
        email: data.email ?? null,
        email_status: data.email_status ?? null,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        company: data.company ?? null,
        job_title: data.job_title ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function emailFinderStep(
  input: EmailFinderInput
): Promise<EmailFinderResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
emailFinderStep.maxRetries = 0;

export const _integrationType = "leadmagic";
