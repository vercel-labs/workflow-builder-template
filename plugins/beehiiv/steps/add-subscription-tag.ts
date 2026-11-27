import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { BeehiivCredentials } from "../credentials";

const BEEHIIV_API_URL = "https://api.beehiiv.com/v2";

type SubscriptionData = {
  id: string;
  email: string;
  status: string;
  tags?: string[];
};

type AddSubscriptionTagResult =
  | { success: true; id: string; email: string; tags: string[] }
  | { success: false; error: string };

export type AddSubscriptionTagCoreInput = {
  subscriptionId: string;
  tags: string;
};

export type AddSubscriptionTagInput = StepInput &
  AddSubscriptionTagCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: AddSubscriptionTagCoreInput,
  credentials: BeehiivCredentials
): Promise<AddSubscriptionTagResult> {
  const apiKey = credentials.BEEHIIV_API_KEY;
  const publicationId = credentials.BEEHIIV_PUBLICATION_ID;

  if (!apiKey) {
    return {
      success: false,
      error:
        "BEEHIIV_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!publicationId) {
    return {
      success: false,
      error:
        "BEEHIIV_PUBLICATION_ID is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const tagsArray = input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tagsArray.length === 0) {
      return {
        success: false,
        error: "At least one tag is required",
      };
    }

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${publicationId}/subscriptions/${encodeURIComponent(input.subscriptionId)}/tags`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ tags: tagsArray }),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "Subscription not found",
        };
      }
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = (await response.json()) as { data: SubscriptionData };
    return {
      success: true,
      id: result.data.id,
      email: result.data.email,
      tags: result.data.tags || [],
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add subscription tag: ${getErrorMessage(error)}`,
    };
  }
}

export async function addSubscriptionTagStep(
  input: AddSubscriptionTagInput
): Promise<AddSubscriptionTagResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "beehiiv";
