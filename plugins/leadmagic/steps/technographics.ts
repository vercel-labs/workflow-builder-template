import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { LeadMagicCredentials } from "../credentials";

const LEADMAGIC_API_URL = "https://api.leadmagic.io";

type TechnographicsResult =
  | { success: true; data: { domain: string | null; technologies: unknown; categories: unknown } }
  | { success: false; error: { message: string } };

export type TechnographicsCoreInput = {
  domain: string;
};

export type TechnographicsInput = StepInput &
  TechnographicsCoreInput & {
    integrationId?: string;
  };

interface TechnographicsResponse {
  domain?: string;
  technologies?: string[];
  categories?: string[];
  [key: string]: unknown;
}

async function stepHandler(
  input: TechnographicsCoreInput,
  credentials: LeadMagicCredentials
): Promise<TechnographicsResult> {
  const apiKey = credentials.LEADMAGIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: { message: "API key is required" } };
  }

  if (!input.domain) {
    return { success: false, error: { message: "Company domain is required" } };
  }

  try {
    const response = await fetch(`${LEADMAGIC_API_URL}/v1/companies/technographics`, {
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

    const data = (await response.json()) as TechnographicsResponse;

    return {
      success: true,
      data: {
        domain: data.domain ?? null,
        technologies: data.technologies ?? [],
        categories: data.categories ?? [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function technographicsStep(
  input: TechnographicsInput
): Promise<TechnographicsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
technographicsStep.maxRetries = 0;

export const _integrationType = "leadmagic";
