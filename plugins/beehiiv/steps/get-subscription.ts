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
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referring_site?: string;
  referral_code?: string;
  custom_fields?: Array<{ name: string; value: string }>;
  tags?: string[];
  stats?: {
    emails_received: number;
    open_rate: number;
    click_through_rate: number;
  };
};

type GetSubscriptionResult =
  | {
      success: true;
      id: string;
      email: string;
      status: string;
      created: number;
      subscriptionTier: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      referringSite?: string;
      referralCode?: string;
      customFields?: Array<{ name: string; value: string }>;
      tags?: string[];
      stats?: {
        emailsReceived: number;
        openRate: number;
        clickThroughRate: number;
      };
    }
  | { success: false; error: string };

export type GetSubscriptionCoreInput = {
  email: string;
  expand?: string;
};

export type GetSubscriptionInput = StepInput &
  GetSubscriptionCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetSubscriptionCoreInput,
  credentials: BeehiivCredentials
): Promise<GetSubscriptionResult> {
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
    const encodedEmail = encodeURIComponent(input.email);
    let url = `${BEEHIIV_API_URL}/publications/${publicationId}/subscriptions/by_email/${encodedEmail}`;

    if (input.expand && input.expand !== "none") {
      url += `?expand[]=${input.expand}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

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
    const data = result.data;

    return {
      success: true,
      id: data.id,
      email: data.email,
      status: data.status,
      created: data.created,
      subscriptionTier: data.subscription_tier,
      ...(data.utm_source && { utmSource: data.utm_source }),
      ...(data.utm_medium && { utmMedium: data.utm_medium }),
      ...(data.utm_campaign && { utmCampaign: data.utm_campaign }),
      ...(data.referring_site && { referringSite: data.referring_site }),
      ...(data.referral_code && { referralCode: data.referral_code }),
      ...(data.custom_fields && { customFields: data.custom_fields }),
      ...(data.tags && { tags: data.tags }),
      ...(data.stats && {
        stats: {
          emailsReceived: data.stats.emails_received,
          openRate: data.stats.open_rate,
          clickThroughRate: data.stats.click_through_rate,
        },
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get subscription: ${getErrorMessage(error)}`,
    };
  }
}

export async function getSubscriptionStep(
  input: GetSubscriptionInput
): Promise<GetSubscriptionResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "beehiiv";
