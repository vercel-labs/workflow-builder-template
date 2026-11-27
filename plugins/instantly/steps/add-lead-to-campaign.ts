import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type AddLeadToCampaignResult =
  | { success: true; data: { id: string; campaignId: string } }
  | { success: false; error: { message: string } };

export type AddLeadToCampaignCoreInput = {
  campaignId: string;
  email: string;
};

export type AddLeadToCampaignInput = StepInput &
  AddLeadToCampaignCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: AddLeadToCampaignCoreInput,
  credentials: InstantlyCredentials
): Promise<AddLeadToCampaignResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.campaignId) {
    return { success: false, error: { message: "Campaign ID is required" } };
  }

  if (!input.email) {
    return { success: false, error: { message: "Email is required" } };
  }

  try {
    // Add lead to campaign by creating a new lead entry
    const response = await fetch(`${INSTANTLY_API_URL}/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign: input.campaignId,
        email: input.email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to add lead to campaign: ${response.status} - ${errorText}` },
      };
    }

    const responseData = (await response.json()) as { id: string };

    return {
      success: true,
      data: {
        id: responseData.id || input.email,
        campaignId: input.campaignId,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { message: `Failed to add lead to campaign: ${message}` },
    };
  }
}

export async function addLeadToCampaignStep(
  input: AddLeadToCampaignInput
): Promise<AddLeadToCampaignResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
addLeadToCampaignStep.maxRetries = 0;

export const _integrationType = "instantly";

