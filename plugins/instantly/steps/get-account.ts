import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type GetAccountResult =
  | { success: true; email: string; status: string; warmupEnabled: boolean }
  | { success: false; error: string };

export type GetAccountCoreInput = {
  email: string;
};

export type GetAccountInput = StepInput &
  GetAccountCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetAccountCoreInput,
  credentials: InstantlyCredentials
): Promise<GetAccountResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.email) {
    return { success: false, error: "Email is required" };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/accounts/${encodeURIComponent(input.email)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Account not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to get account: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      email: string;
      status: string;
      warmup_enabled?: boolean;
    };

    return {
      success: true,
      email: data.email,
      status: data.status || "unknown",
      warmupEnabled: data.warmup_enabled || false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to get account: ${message}` };
  }
}

export async function getAccountStep(
  input: GetAccountInput
): Promise<GetAccountResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getAccountStep.maxRetries = 0;

export const _integrationType = "instantly";

