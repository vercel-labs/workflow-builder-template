import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type CreateLeadResult =
  | { success: true; data: { id: string; email: string } }
  | { success: false; error: { message: string } };

export type CreateLeadCoreInput = {
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  personalization?: string;
  phone?: string;
  website?: string;
  customVariables?: string;
};

export type CreateLeadInput = StepInput &
  CreateLeadCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateLeadCoreInput,
  credentials: InstantlyCredentials
): Promise<CreateLeadResult> {
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

  try {
    let customVars: Record<string, string> = {};
    if (input.customVariables) {
      try {
        customVars = JSON.parse(input.customVariables);
      } catch {
        return { success: false, error: { message: "Invalid JSON in custom variables" } };
      }
    }

    const leadData: Record<string, unknown> = {
      campaign: input.campaignId,
      email: input.email,
      ...(input.firstName && { first_name: input.firstName }),
      ...(input.lastName && { last_name: input.lastName }),
      ...(input.companyName && { company_name: input.companyName }),
      ...(input.personalization && { personalization: input.personalization }),
      ...(input.phone && { phone: input.phone }),
      ...(input.website && { website: input.website }),
      ...(Object.keys(customVars).length > 0 && { custom_variables: customVars }),
    };

    const response = await fetch(`${INSTANTLY_API_URL}/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to create lead: ${response.status} - ${errorText}` },
      };
    }

    const responseData = (await response.json()) as { id: string; email: string };

    return {
      success: true,
      data: {
        id: responseData.id,
        email: responseData.email,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to create lead: ${message}` } };
  }
}

export async function createLeadStep(
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createLeadStep.maxRetries = 0;

export const _integrationType = "instantly";

