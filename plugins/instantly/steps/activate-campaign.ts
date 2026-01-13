import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type ActivateCampaignResult =
  | { success: true; data: { id: string; status: string } }
  | { success: false; error: { message: string } };

export type ActivateCampaignCoreInput = {
  campaignId: string;
};

export type ActivateCampaignInput = StepInput &
  ActivateCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: ActivateCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<ActivateCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.campaignId) {
    return { success: false, error: { message: "Campaign ID is required" } };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns/${input.campaignId}/activate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: { message: "Campaign not found" } };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to activate campaign: ${response.status} - ${errorText}` },
      };
    }

    return {
      success: true,
      data: {
        id: input.campaignId,
        status: "active",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to activate campaign: ${message}` } };
  }
}

export async function activateCampaignStep(
  input: ActivateCampaignInput
): Promise<ActivateCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
activateCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

