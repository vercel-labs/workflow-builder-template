import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type UpdateCampaignResult =
  | { success: true; id: string; name: string }
  | { success: false; error: string };

export type UpdateCampaignCoreInput = {
  campaignId: string;
  name?: string;
};

export type UpdateCampaignInput = StepInput &
  UpdateCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: UpdateCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<UpdateCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.campaignId) {
    return { success: false, error: "Campaign ID is required" };
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (input.name) {
      updateData.name = input.name;
    }

    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns/${input.campaignId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Campaign not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to update campaign: ${response.status} - ${errorText}`,
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
    return { success: false, error: `Failed to update campaign: ${message}` };
  }
}

export async function updateCampaignStep(
  input: UpdateCampaignInput
): Promise<UpdateCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
updateCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

