import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type CreateCampaignResult =
  | { success: true; id: string; name: string }
  | { success: false; error: string };

export type CreateCampaignCoreInput = {
  name: string;
};

export type CreateCampaignInput = StepInput &
  CreateCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<CreateCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.name) {
    return { success: false, error: "Campaign name is required" };
  }

  try {
    const response = await fetch(`${INSTANTLY_API_URL}/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to create campaign: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as { id: string; name: string };

    return {
      success: true,
      id: data.id,
      name: data.name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to create campaign: ${message}` };
  }
}

export async function createCampaignStep(
  input: CreateCampaignInput
): Promise<CreateCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

