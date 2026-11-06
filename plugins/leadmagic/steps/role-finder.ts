import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type RoleFinderResult =
  | { success: true; data: { first_name: string | null; last_name: string | null; email: string | null; job_title: string | null; linkedin_url: string | null } }
  | { success: false; error: { message: string } };

export type RoleFinderCoreInput = {
  company_name: string;
  role: string;
};

export type RoleFinderInput = StepInput &
  RoleFinderCoreInput & {
    integrationId?: string;
  };

interface RoleFinderResponse {
  first_name?: string;
  last_name?: string;
  email?: string;
  job_title?: string;
  linkedin_url?: string;
  [key: string]: unknown;
}

async function stepHandler(
  input: RoleFinderCoreInput,
  credentials: LeadMagicCredentials
): Promise<RoleFinderResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.company_name) {
    return { success: false, error: { message: "Company name is required" } };
  }

  if (!input.role) {
    return { success: false, error: { message: "Role/title is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/people/role-finder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        company_name: input.company_name,
        job_title: input.role,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as RoleFinderResponse;

    return {
      success: true,
      data: {
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        email: data.email ?? null,
        job_title: data.job_title ?? null,
        linkedin_url: data.linkedin_url ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function roleFinderStep(
  input: RoleFinderInput
): Promise<RoleFinderResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
roleFinderStep.maxRetries = 0;

export const _integrationType = "leadmagic";
