import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type UpdateLeadStatusResult =
  | { success: true; id: string; status: string }
  | { success: false; error: string };

export type UpdateLeadStatusCoreInput = {
  campaignId: string;
  email: string;
  status: string;
};

export type UpdateLeadStatusInput = StepInput &
  UpdateLeadStatusCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: UpdateLeadStatusCoreInput,
  credentials: InstantlyCredentials
): Promise<UpdateLeadStatusResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.campaignId) {
    return { success: false, error: "Campaign ID is required" };
  }

  if (!input.email) {
    return { success: false, error: "Email is required" };
  }

  if (!input.status) {
    return { success: false, error: "Status is required" };
  }

  try {
    const response = await fetch(
      `${INSTANTLY_API_URL}/leads/update-interest-status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: input.campaignId,
          email: input.email,
          interest_status: input.status,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to update lead status: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as { id?: string };

    return {
      success: true,
      id: data.id || input.email,
      status: input.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to update lead status: ${message}` };
  }
}

export async function updateLeadStatusStep(
  input: UpdateLeadStatusInput
): Promise<UpdateLeadStatusResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
updateLeadStatusStep.maxRetries = 0;

export const _integrationType = "instantly";

