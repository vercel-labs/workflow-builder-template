import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type PauseAccountResult =
  | { success: true; data: { email: string; status: string } }
  | { success: false; error: { message: string } };

export type PauseAccountCoreInput = {
  email: string;
};

export type PauseAccountInput = StepInput &
  PauseAccountCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: PauseAccountCoreInput,
  credentials: InstantlyCredentials
): Promise<PauseAccountResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.email) {
    return { success: false, error: { message: "Email is required" } };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/accounts/${encodeURIComponent(input.email)}/pause`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: { message: "Account not found" } };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to pause account: ${response.status} - ${errorText}` },
      };
    }

    return {
      success: true,
      data: {
        email: input.email,
        status: "paused",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to pause account: ${message}` } };
  }
}

export async function pauseAccountStep(
  input: PauseAccountInput
): Promise<PauseAccountResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
pauseAccountStep.maxRetries = 0;

export const _integrationType = "instantly";

