import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type ScrapeResult = {
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
};

export type OlostepScrapeInput = StepInput & {
  integrationId?: string;
  url: string;
  formats?: ("markdown" | "html" | "text")[];
  waitForSelector?: string;
};

/**
 * Scrape logic using Olostep API
 */
async function scrape(input: OlostepScrapeInput): Promise<ScrapeResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.OLOSTEP_API_KEY;

  if (!apiKey) {
    throw new Error("Olostep API Key is not configured.");
  }

  try {
    const response = await fetch("https://api.olostep.com/v1/scrapes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url_to_scrape: input.url,
        formats: input.formats || ["markdown"],
        wait_for_selector: input.waitForSelector,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Olostep API error: ${errorText}`);
    }

    const result = await response.json();

    return {
      markdown: result.markdown_content || result.markdown,
      html: result.html_content || result.html,
      metadata: {
        title: result.title,
        url: result.url,
        statusCode: result.status_code,
      },
    };
  } catch (error) {
    throw new Error(`Failed to scrape: ${getErrorMessage(error)}`);
  }
}

/**
 * Olostep Scrape Step
 * Scrapes content from a URL using Olostep
 */
export async function olostepScrapeStep(
  input: OlostepScrapeInput
): Promise<ScrapeResult> {
  "use step";
  return withStepLogging(input, () => scrape(input));
}
olostepScrapeStep.maxRetries = 0;

// Required for codegen auto-generation
export const _integrationType = "olostep";
