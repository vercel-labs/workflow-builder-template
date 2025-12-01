import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FirecrawlCredentials } from "../credentials";

type ScrapeResult = {
  markdown?: string;
  metadata?: Record<string, unknown>;
};

export type FirecrawlScrapeCoreInput = {
  url: string;
  formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
};

export type FirecrawlScrapeInput = StepInput &
  FirecrawlScrapeCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FirecrawlScrapeCoreInput,
  credentials: FirecrawlCredentials
): Promise<ScrapeResult> {
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
 * App entry point - fetches credentials and wraps with logging
 */
export async function firecrawlScrapeStep(
  input: FirecrawlScrapeInput
): Promise<ScrapeResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "firecrawl";
