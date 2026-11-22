import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type CompanyFundingResult =
  | { success: true; data: { company_name: string | null; total_funding: string | null; last_funding_date: string | null; last_funding_amount: string | null; funding_rounds: unknown } }
  | { success: false; error: { message: string } };

export type CompanyFundingCoreInput = {
  domain: string;
};

export type CompanyFundingInput = StepInput &
  CompanyFundingCoreInput & {
    integrationId?: string;
  };

interface CompanyFundingResponse {
  company_name?: string;
  total_funding?: string;
  last_funding_date?: string;
  last_funding_amount?: string;
  funding_rounds?: number;
  [key: string]: unknown;
}

async function stepHandler(
  input: CompanyFundingCoreInput,
  credentials: LeadMagicCredentials
): Promise<CompanyFundingResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.domain) {
    return { success: false, error: { message: "Company domain is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/companies/company-funding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        company_domain: input.domain,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: { message: `API error: ${response.status} - ${errorText}` },
      };
    }

    const data = (await response.json()) as CompanyFundingResponse;

    return {
      success: true,
      data: {
        company_name: data.company_name ?? null,
        total_funding: data.total_funding ?? null,
        last_funding_date: data.last_funding_date ?? null,
        last_funding_amount: data.last_funding_amount ?? null,
        funding_rounds: data.funding_rounds ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function companyFundingStep(
  input: CompanyFundingInput
): Promise<CompanyFundingResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
companyFundingStep.maxRetries = 0;

export const _integrationType = "leadmagic";
