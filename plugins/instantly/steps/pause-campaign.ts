import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type PauseCampaignResult =
  | { success: true; id: string; status: string }
  | { success: false; error: string };

export type PauseCampaignCoreInput = {
  campaignId: string;
};

export type PauseCampaignInput = StepInput &
  PauseCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: PauseCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<PauseCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.campaignId) {
    return { success: false, error: "Campaign ID is required" };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns/${input.campaignId}/pause`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Campaign not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to pause campaign: ${response.status} - ${errorText}`,
      };
    }

    return {
      success: true,
      id: input.campaignId,
      status: "paused",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to pause campaign: ${message}` };
  }
}

export async function pauseCampaignStep(
  input: PauseCampaignInput
): Promise<PauseCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
pauseCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

