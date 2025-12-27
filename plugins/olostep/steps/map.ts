import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type MapResult = {
  urls: string[];
  count: number;
};

export type OlostepMapInput = StepInput & {
  integrationId?: string;
  url: string;
  limit?: number;
  includeSubdomains?: boolean;
};

/**
 * Map logic using Olostep API
 * Gets all URLs from a website (sitemap discovery)
 */
async function mapUrls(input: OlostepMapInput): Promise<MapResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.OLOSTEP_API_KEY;

  if (!apiKey) {
    throw new Error("Olostep API Key is not configured.");
  }

  try {
    const response = await fetch("https://api.olostep.com/v1/map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: input.url,
        limit: input.limit || 100,
        include_subdomains: input.includeSubdomains || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Olostep API error: ${errorText}`);
    }

    const result = await response.json();

    const urls = result.urls || result.links || [];
    const limitedUrls = urls.slice(0, input.limit || 100);

    return {
      urls: limitedUrls,
      count: limitedUrls.length,
    };
  } catch (error) {
    throw new Error(`Failed to map URLs: ${getErrorMessage(error)}`);
  }
}

/**
 * Olostep Map Step
 * Discovers all URLs from a website using Olostep
 */
export async function olostepMapStep(
  input: OlostepMapInput
): Promise<MapResult> {
  "use step";
  return withStepLogging(input, () => mapUrls(input));
}
olostepMapStep.maxRetries = 0;

// Required for codegen auto-generation
export const _integrationType = "olostep";
