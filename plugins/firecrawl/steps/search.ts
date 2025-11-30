import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type SearchResult = {
  web?: unknown[];
};

export type FirecrawlSearchInput = StepInput & {
  integrationId?: string;
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  };
};

/**
 * Search logic
 */
async function search(input: FirecrawlSearchInput): Promise<SearchResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

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
 * Firecrawl Search Step
 * Searches the web using Firecrawl
 */
export async function firecrawlSearchStep(
  input: FirecrawlSearchInput
): Promise<SearchResult> {
  "use step";
  return withStepLogging(input, () => search(input));
}
