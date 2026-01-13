import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type MobileFinderResult =
  | { success: true; data: { mobile: string | null; mobile_status: string | null; first_name: string | null; last_name: string | null } }
  | { success: false; error: { message: string } };

export type MobileFinderCoreInput = {
  profile_url: string;
};

export type MobileFinderInput = StepInput &
  MobileFinderCoreInput & {
    integrationId?: string;
  };

interface MobileFinderResponse {
  mobile?: string;
  mobile_status?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

async function stepHandler(
  input: MobileFinderCoreInput,
  credentials: LeadMagicCredentials
): Promise<MobileFinderResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.profile_url) {
    return { success: false, error: { message: "LinkedIn profile URL is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/people/mobile-finder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        profile_url: input.profile_url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as MobileFinderResponse;

    return {
      success: true,
      data: {
        mobile: data.mobile ?? null,
        mobile_status: data.mobile_status ?? null,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function mobileFinderStep(
  input: MobileFinderInput
): Promise<MobileFinderResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
mobileFinderStep.maxRetries = 0;

export const _integrationType = "leadmagic";
