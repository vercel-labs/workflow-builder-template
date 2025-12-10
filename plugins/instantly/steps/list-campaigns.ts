import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type Campaign = {
  id: string;
  name: string;
  status: string;
};

type ListCampaignsResult =
  | { success: true; campaigns: Campaign[]; total: number }
  | { success: false; error: string };

export type ListCampaignsCoreInput = {
  status?: string;
  limit?: number;
};

export type ListCampaignsInput = StepInput &
  ListCampaignsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: ListCampaignsCoreInput,
  credentials: InstantlyCredentials
): Promise<ListCampaignsResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  try {
    const params = new URLSearchParams();
    params.append("limit", String(input.limit || 100));

    if (input.status && input.status !== "all") {
      params.append("status", input.status);
    }

    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to list campaigns: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      items: Array<{ id: string; name: string; status: string }>;
      total_count?: number;
    };

    const campaigns: Campaign[] = data.items.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status || "unknown",
    }));

    return {
      success: true,
      campaigns,
      total: data.total_count || campaigns.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to list campaigns: ${message}` };
  }
}

export async function listCampaignsStep(
  input: ListCampaignsInput
): Promise<ListCampaignsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
listCampaignsStep.maxRetries = 0;

export const _integrationType = "instantly";

