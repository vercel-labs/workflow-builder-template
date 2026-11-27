import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type CompanySearchResult =
  | { success: true; data: { name: string | null; domain: string | null; industry: string | null; employee_count: number | null; location: string | null; description: string | null; linkedin_url: string | null } }
  | { success: false; error: { message: string } };

export type CompanySearchCoreInput = {
  domain?: string;
  linkedin_url?: string;
};

export type CompanySearchInput = StepInput &
  CompanySearchCoreInput & {
    integrationId?: string;
  };

interface CompanySearchResponse {
  name?: string;
  domain?: string;
  industry?: string;
  employee_count?: number;
  location?: string;
  description?: string;
  linkedin_url?: string;
  [key: string]: unknown;
}

async function stepHandler(
  input: CompanySearchCoreInput,
  credentials: LeadMagicCredentials
): Promise<CompanySearchResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.domain && !input.linkedin_url) {
    return { success: false, error: { message: "Either domain or LinkedIn URL is required" } };
  }

  try {
    const body: Record<string, string> = {};
    if (input.domain) body.company_domain = input.domain;
    if (input.linkedin_url) body.profile_url = input.linkedin_url;

    const response = await fetch(`${LEADMAGIC_API_URL}/v1/companies/company-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as CompanySearchResponse;

    return {
      success: true,
      data: {
        name: data.name ?? null,
        domain: data.domain ?? null,
        industry: data.industry ?? null,
        employee_count: data.employee_count ?? null,
        location: data.location ?? null,
        description: data.description ?? null,
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

export async function companySearchStep(
  input: CompanySearchInput
): Promise<CompanySearchResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
companySearchStep.maxRetries = 0;

export const _integrationType = "leadmagic";
