import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type UpdateLeadStatusResult =
  | { success: true; data: { id: string; status: string } }
  | { success: false; error: { message: string } };

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
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.campaignId) {
    return { success: false, error: { message: "Campaign ID is required" } };
  }

  if (!input.email) {
    return { success: false, error: { message: "Email is required" } };
  }

  if (!input.status) {
    return { success: false, error: { message: "Status is required" } };
  }

  // Map string status to numeric value
  const statusMap: Record<string, number> = {
    interested: 1,
    not_interested: -1,
    meeting_booked: 2,
    meeting_completed: 3,
    closed: 4,
    out_of_office: 0,
    wrong_person: -2,
  };

  const interestValue = statusMap[input.status] ?? 1;

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
          lead_email: input.email,
          interest_value: interestValue,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to update lead status: ${response.status} - ${errorText}` },
      };
    }

    const responseData = (await response.json()) as { id?: string };

    return {
      success: true,
      data: {
        id: responseData.id || input.email,
        status: input.status,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to update lead status: ${message}` } };
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

