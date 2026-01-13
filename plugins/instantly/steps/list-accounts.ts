import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type Account = {
  email: string;
  status: string;
  warmupEnabled: boolean;
};

type ListAccountsResult =
  | { success: true; data: { accounts: Account[]; total: number } }
  | { success: false; error: { message: string } };

export type ListAccountsCoreInput = {
  limit?: number;
};

export type ListAccountsInput = StepInput &
  ListAccountsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: ListAccountsCoreInput,
  credentials: InstantlyCredentials
): Promise<ListAccountsResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  try {
    const params = new URLSearchParams();
    params.append("limit", String(input.limit || 100));

    const response = await fetch(
      `${INSTANTLY_API_URL}/accounts?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to list accounts: ${response.status} - ${errorText}` },
      };
    }

    const responseData = (await response.json()) as {
      items: Array<{
        email: string;
        status: string;
        warmup_enabled?: boolean;
      }>;
      total_count?: number;
    };

    const accounts: Account[] = responseData.items.map((item) => ({
      email: item.email,
      status: item.status || "unknown",
      warmupEnabled: item.warmup_enabled || false,
    }));

    return {
      success: true,
      data: {
        accounts,
        total: responseData.total_count || accounts.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to list accounts: ${message}` } };
  }
}

export async function listAccountsStep(
  input: ListAccountsInput
): Promise<ListAccountsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
listAccountsStep.maxRetries = 0;

export const _integrationType = "instantly";

