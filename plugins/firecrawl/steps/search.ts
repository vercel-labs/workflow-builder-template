import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FirecrawlCredentials } from "../credentials";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

type FirecrawlSearchResponse = {
  success: boolean;
  data?: unknown[];
  error?: string;
};

type SearchResult = {
  data?: unknown[];
};

export type FirecrawlSearchCoreInput = {
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  };
};

export type FirecrawlSearchInput = StepInput &
  FirecrawlSearchCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic
 */
async function stepHandler(
  input: FirecrawlSearchCoreInput,
  credentials: FirecrawlCredentials
): Promise<SearchResult> {
  const apiKey = credentials.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("Firecrawl API Key is not configured.");
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: input.query,
        limit: input.limit ? Number(input.limit) : undefined,
        scrapeOptions: input.scrapeOptions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as FirecrawlSearchResponse;

    if (!result.success) {
      throw new Error(result.error || "Search failed");
    }

    return {
      data: result.data,
    };
  } catch (error) {
    throw new Error(`Failed to search: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function firecrawlSearchStep(
  input: FirecrawlSearchInput
): Promise<SearchResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
firecrawlSearchStep.maxRetries = 0;

export const _integrationType = "firecrawl";
