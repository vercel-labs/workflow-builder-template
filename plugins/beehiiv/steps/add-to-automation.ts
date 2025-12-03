import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { BeehiivCredentials } from "../credentials";

const BEEHIIV_API_URL = "https://api.beehiiv.com/v2";

type AutomationJourneyData = {
  id: string;
  automation_id: string;
  subscription_id?: string;
  email?: string;
  status: string;
  started_at?: number;
  completed_at?: number;
};

type AddToAutomationResult =
  | {
      success: true;
      id: string;
      automationId: string;
      subscriptionId?: string;
      email?: string;
      status: string;
      startedAt?: number;
    }
  | { success: false; error: string };

export type AddToAutomationCoreInput = {
  automationId: string;
  subscriptionId: string;
  doubleOptOverride?: string;
};

export type AddToAutomationInput = StepInput &
  AddToAutomationCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: AddToAutomationCoreInput,
  credentials: BeehiivCredentials
): Promise<AddToAutomationResult> {
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

  if (!input.subscriptionId) {
    return {
      success: false,
      error: "Subscription ID is required",
    };
  }

  try {
    const body: Record<string, unknown> = {
      subscription_id: input.subscriptionId,
    };

    if (input.doubleOptOverride && input.doubleOptOverride !== "not_set") {
      body.double_opt_override = input.doubleOptOverride;
    }

    const response = await fetch(
      `${BEEHIIV_API_URL}/publications/${publicationId}/automations/${input.automationId}/journeys`,
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
      if (response.status === 404) {
        return {
          success: false,
          error: "Automation or subscription not found",
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

    const result = (await response.json()) as { data: AutomationJourneyData };
    return {
      success: true,
      id: result.data.id,
      automationId: result.data.automation_id,
      ...(result.data.subscription_id && {
        subscriptionId: result.data.subscription_id,
      }),
      ...(result.data.email && { email: result.data.email }),
      status: result.data.status,
      ...(result.data.started_at && { startedAt: result.data.started_at }),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add to automation: ${getErrorMessage(error)}`,
    };
  }
}

export async function addToAutomationStep(
  input: AddToAutomationInput
): Promise<AddToAutomationResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "beehiiv";
