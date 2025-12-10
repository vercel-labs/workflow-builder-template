import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type UpdateLeadResult =
  | { success: true; id: string; email: string }
  | { success: false; error: string };

export type UpdateLeadCoreInput = {
  leadId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  customVariables?: string;
};

export type UpdateLeadInput = StepInput &
  UpdateLeadCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: UpdateLeadCoreInput,
  credentials: InstantlyCredentials
): Promise<UpdateLeadResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "INSTANTLY_API_KEY is required" };
  }

  if (!input.leadId) {
    return { success: false, error: "Lead ID is required" };
  }

  try {
    let customVars: Record<string, string> = {};
    if (input.customVariables) {
      try {
        customVars = JSON.parse(input.customVariables);
      } catch {
        return { success: false, error: "Invalid JSON in custom variables" };
      }
    }

    const updateData: Record<string, unknown> = {
      ...(input.firstName && { first_name: input.firstName }),
      ...(input.lastName && { last_name: input.lastName }),
      ...(input.companyName && { company_name: input.companyName }),
      ...(Object.keys(customVars).length > 0 && { custom_variables: customVars }),
    };

    const response = await fetch(`${INSTANTLY_API_URL}/leads/${input.leadId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Lead not found" };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to update lead: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as { id: string; email: string };

    return {
      success: true,
      id: data.id,
      email: data.email,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to update lead: ${message}` };
  }
}

export async function updateLeadStep(
  input: UpdateLeadInput
): Promise<UpdateLeadResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
updateLeadStep.maxRetries = 0;

export const _integrationType = "instantly";

