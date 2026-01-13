import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { InstantlyCredentials } from "../credentials";

const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

type DeleteLeadResult =
  | { success: true; data: { deleted: boolean } }
  | { success: false; error: { message: string } };

export type DeleteLeadCoreInput = {
  leadId: string;
};

export type DeleteLeadInput = StepInput &
  DeleteLeadCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: DeleteLeadCoreInput,
  credentials: InstantlyCredentials
): Promise<DeleteLeadResult> {
  const apiKey = credentials.INSTANTLY_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "INSTANTLY_API_KEY is required" } };
  }

  if (!input.leadId) {
    return { success: false, error: { message: "Lead ID is required" } };
  }

  try {
    const response = await fetch(`${INSTANTLY_API_URL}/leads/${input.leadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: { message: "Lead not found" } };
      }
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `Failed to delete lead: ${response.status} - ${errorText}` },
      };
    }

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: { message: `Failed to delete lead: ${message}` } };
  }
}

export async function deleteLeadStep(
  input: DeleteLeadInput
): Promise<DeleteLeadResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
deleteLeadStep.maxRetries = 0;

export const _integrationType = "instantly";

