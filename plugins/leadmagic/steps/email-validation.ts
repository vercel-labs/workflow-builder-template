import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type EmailValidationResult =
  | { success: true; data: { email: string | null; status: string | null; is_valid: boolean | null; is_deliverable: boolean | null; is_catch_all: boolean | null; is_disposable: boolean | null } }
  | { success: false; error: { message: string } };

export type EmailValidationCoreInput = {
  email: string;
};

export type EmailValidationInput = StepInput &
  EmailValidationCoreInput & {
    integrationId?: string;
  };

interface EmailValidationResponse {
  email?: string;
  status?: string;
  is_valid?: boolean;
  is_deliverable?: boolean;
  is_catch_all?: boolean;
  is_disposable?: boolean;
  [key: string]: unknown;
}

async function stepHandler(
  input: EmailValidationCoreInput,
  credentials: LeadMagicCredentials
): Promise<EmailValidationResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.email) {
    return { success: false, error: { message: "Email address is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/people/email-validation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        email: input.email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as EmailValidationResponse;

    return {
      success: true,
      data: {
        email: data.email ?? null,
        status: data.status ?? null,
        is_valid: data.is_valid ?? null,
        is_deliverable: data.is_deliverable ?? null,
        is_catch_all: data.is_catch_all ?? null,
        is_disposable: data.is_disposable ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function emailValidationStep(
  input: EmailValidationInput
): Promise<EmailValidationResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
emailValidationStep.maxRetries = 0;

export const _integrationType = "leadmagic";
