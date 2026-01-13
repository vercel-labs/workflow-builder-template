import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type EnableWarmupResult =
  | { success: true; data: { enabled: boolean } }
  | { success: false; error: { message: string } };

export type EnableWarmupCoreInput = {
  emails: string;
};

export type EnableWarmupInput = StepInput &
  EnableWarmupCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: EnableWarmupCoreInput,
  credentials: InstantlyCredentials
): Promise<EnableWarmupResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.emails) {
    return { success: false, error: { message: "At least one email is required" } };
  }

  try {
    // Parse emails from newline-separated string
    const emailList = input.emails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) {
      return { success: false, error: { message: "At least one valid email is required" } };
    }

    const response = await fetch(`${INSTANTLY_API_URL}/accounts/warmup/enable`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails: emailList,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to enable warmup: ${response.status} - ${errorText}` },
      };
    }

    return {
      success: true,
      data: { enabled: true },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to enable warmup: ${message}` } };
  }
}

export async function enableWarmupStep(
  input: EnableWarmupInput
): Promise<EnableWarmupResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
enableWarmupStep.maxRetries = 0;

export const _integrationType = "instantly";

