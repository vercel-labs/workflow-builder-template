import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type GetCampaignResult =
  | { success: true; id: string; name: string; status: string }
  | { success: false; error: string };

export type GetCampaignCoreInput = {
  campaignId: string;
};

export type GetCampaignInput = StepInput &
  GetCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<GetCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.campaignId) {
    return { success: false, error: "Campaign ID is required" };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns/${input.campaignId}`,
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
        return { success: false, error: "Campaign not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to get campaign: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      id: string;
      name: string;
      status: string;
    };

    return {
      success: true,
      id: data.id,
      name: data.name,
      status: data.status || "unknown",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to get campaign: ${message}` };
  }
}

export async function getCampaignStep(
  input: GetCampaignInput
): Promise<GetCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

