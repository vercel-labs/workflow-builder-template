import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type ScrapeResult = {
  markdown?: string;
  metadata?: Record<string, unknown>;
};

export type FirecrawlScrapeInput = StepInput & {
  integrationId?: string;
  url: string;
  formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
};

/**
 * Scrape logic
 */
async function scrape(input: FirecrawlScrapeInput): Promise<ScrapeResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("Firecrawl API Key is not configured.");
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.scrape(input.url, {
      formats: input.formats || ["markdown"],
    });

    return {
      markdown: result.markdown,
      metadata: result.metadata,
    };
  } catch (error) {
    throw new Error(`Failed to scrape: ${getErrorMessage(error)}`);
  }
}

/**
 * Firecrawl Scrape Step
 * Scrapes content from a URL using Firecrawl
 */
export async function firecrawlScrapeStep(
  input: FirecrawlScrapeInput
): Promise<ScrapeResult> {
  "use step";
  return withStepLogging(input, () => scrape(input));
}
