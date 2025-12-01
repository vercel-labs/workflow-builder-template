import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FirecrawlCredentials } from "../credentials";

type SearchResult = {
  web?: unknown[];
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
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.search(input.query, {
      limit: input.limit ? Number(input.limit) : undefined,
      scrapeOptions: input.scrapeOptions,
    });

    return {
      web: result.web,
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

export const _integrationType = "firecrawl";
