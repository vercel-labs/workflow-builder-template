import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type GetLeadResult =
  | {
      success: true;
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      status?: string;
    }
  | { success: false; error: string };

export type GetLeadCoreInput = {
  leadId: string;
};

export type GetLeadInput = StepInput &
  GetLeadCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetLeadCoreInput,
  credentials: InstantlyCredentials
): Promise<GetLeadResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.leadId) {
    return { success: false, error: "Lead ID is required" };
  }

  try {
    const response = await fetch(`${INSTANTLY_API_URL}/leads/${input.leadId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Lead not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to get lead: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      lead_status?: string;
    };

    return {
      success: true,
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      status: data.lead_status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to get lead: ${message}` };
  }
}

export async function getLeadStep(
  input: GetLeadInput
): Promise<GetLeadResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getLeadStep.maxRetries = 0;

export const _integrationType = "instantly";

