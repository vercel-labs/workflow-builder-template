import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type ProfileSearchResult =
  | { success: true; data: { first_name: string | null; last_name: string | null; headline: string | null; location: string | null; company: string | null; job_title: string | null; profile_picture: string | null } }
  | { success: false; error: { message: string } };

export type ProfileSearchCoreInput = {
  profile_url: string;
};

export type ProfileSearchInput = StepInput &
  ProfileSearchCoreInput & {
    integrationId?: string;
  };

interface ProfileSearchResponse {
  first_name?: string;
  last_name?: string;
  headline?: string;
  location?: string;
  company?: string;
  job_title?: string;
  profile_picture?: string;
  [key: string]: unknown;
}

async function stepHandler(
  input: ProfileSearchCoreInput,
  credentials: LeadMagicCredentials
): Promise<ProfileSearchResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.profile_url) {
    return { success: false, error: { message: "LinkedIn profile URL is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/people/profile-search`, {
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

    const data = (await response.json()) as ProfileSearchResponse;

    return {
      success: true,
      data: {
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        headline: data.headline ?? null,
        location: data.location ?? null,
        company: data.company ?? null,
        job_title: data.job_title ?? null,
        profile_picture: data.profile_picture ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function profileSearchStep(
  input: ProfileSearchInput
): Promise<ProfileSearchResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
profileSearchStep.maxRetries = 0;

export const _integrationType = "leadmagic";
