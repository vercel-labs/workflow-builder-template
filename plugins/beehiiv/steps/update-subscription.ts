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
  created: number;
  subscription_tier: string;
};

type UpdateSubscriptionResult =
  | { success: true; id: string; email: string; status: string }
  | { success: false; error: string };

export type UpdateSubscriptionCoreInput = {
  email: string;
  tier?: string;
  unsubscribe?: string;
};

export type UpdateSubscriptionInput = StepInput &
  UpdateSubscriptionCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: UpdateSubscriptionCoreInput,
  credentials: BeehiivCredentials
): Promise<UpdateSubscriptionResult> {
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
    const body: Record<string, unknown> = {};

    if (input.tier && input.tier !== "none") {
      body.tier = input.tier;
    }

    if (input.unsubscribe === "true") {
      body.unsubscribe = true;
    }

    const encodedEmail = encodeURIComponent(input.email);
    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${publicationId}/subscriptions/by_email/${encodedEmail}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
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
      status: result.data.status,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update subscription: ${getErrorMessage(error)}`,
    };
  }
}

export async function updateSubscriptionStep(
  input: UpdateSubscriptionInput
): Promise<UpdateSubscriptionResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "beehiiv";
