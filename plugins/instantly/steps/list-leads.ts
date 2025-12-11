import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type Lead = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status?: string;
};

type ListLeadsResult =
  | { success: true; data: { leads: Lead[]; total: number } }
  | { success: false; error: { message: string } };

export type ListLeadsCoreInput = {
  campaignId?: string;
  email?: string;
  limit?: number;
};

export type ListLeadsInput = StepInput &
  ListLeadsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: ListLeadsCoreInput,
  credentials: InstantlyCredentials
): Promise<ListLeadsResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  try {
    const requestBody: Record<string, unknown> = {
      limit: input.limit || 100,
    };

    if (input.campaignId) {
      requestBody.campaign_id = input.campaignId;
    }

    if (input.email) {
      requestBody.email = input.email;
    }

    const response = await fetch(`${INSTANTLY_API_URL}/leads/list`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to list leads: ${response.status} - ${errorText}` },
      };
    }

    const responseData = (await response.json()) as {
      items: Array<{
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        lead_status?: string;
      }>;
      total_count?: number;
    };

    const leads: Lead[] = responseData.items.map((item) => ({
      id: item.id,
      email: item.email,
      firstName: item.first_name,
      lastName: item.last_name,
      status: item.lead_status,
    }));

    return {
      success: true,
      data: {
        leads,
        total: responseData.total_count || leads.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to list leads: ${message}` } };
  }
}

export async function listLeadsStep(
  input: ListLeadsInput
): Promise<ListLeadsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
listLeadsStep.maxRetries = 0;

export const _integrationType = "instantly";

