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

type CreateSubscriptionResult =
  | { success: true; id: string; email: string; status: string }
  | { success: false; error: string };

export type CreateSubscriptionCoreInput = {
  email: string;
  reactivateExisting?: string;
  sendWelcomeEmail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referringSite?: string;
  doubleOptOverride?: string;
  tier?: string;
};

export type CreateSubscriptionInput = StepInput &
  CreateSubscriptionCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateSubscriptionCoreInput,
  credentials: BeehiivCredentials
): Promise<CreateSubscriptionResult> {
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
    const body: Record<string, unknown> = {
      email: input.email,
    };

    if (input.reactivateExisting === "true") {
      body.reactivate_existing = true;
    }

    if (input.sendWelcomeEmail === "true") {
      body.send_welcome_email = true;
    }

    if (input.utmSource) {
      body.utm_source = input.utmSource;
    }

    if (input.utmMedium) {
      body.utm_medium = input.utmMedium;
    }

    if (input.utmCampaign) {
      body.utm_campaign = input.utmCampaign;
    }

    if (input.referringSite) {
      body.referring_site = input.referringSite;
    }

    if (input.doubleOptOverride && input.doubleOptOverride !== "not_set") {
      body.double_opt_override = input.doubleOptOverride;
    }

    if (input.tier) {
      body.tier = input.tier;
    }

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
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
      error: `Failed to create subscription: ${getErrorMessage(error)}`,
    };
  }
}

export async function createSubscriptionStep(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "beehiiv";
