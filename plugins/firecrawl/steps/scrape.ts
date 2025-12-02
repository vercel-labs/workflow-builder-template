import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FirecrawlCredentials } from "../credentials";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

type FirecrawlScrapeResponse = {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
};

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
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: input.url,
        formats: input.formats || ["markdown"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as FirecrawlScrapeResponse;

    if (!result.success) {
      throw new Error(result.error || "Scrape failed");
    }

    return {
      markdown: result.data?.markdown,
      metadata: result.data?.metadata,
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
firecrawlScrapeStep.maxRetries = 0;

export const _integrationType = "firecrawl";
