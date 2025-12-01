import "server-only";

import { ApifyClient } from "apify-client";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";

type ScrapeSingleUrlResult =
  | {
      success: true;
      runId: string;
      status: string;
      markdown?: string;
    }
  | { success: false; error: string };

/**
 * Scrape Single URL Step
 * Scrapes a single URL using apify/website-content-crawler and returns markdown
 */
export async function scrapeSingleUrlStep(
  input: {
    integrationId?: string;
    url: string;
    crawlerType?: string;
  } & StepInput
): Promise<ScrapeSingleUrlResult> {
  "use step";

  return withStepLogging(input, async () => {
    const credentials = input.integrationId
      ? await fetchCredentials(input.integrationId)
      : {};

    const apiKey = credentials.APIFY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "Apify API Token is not configured.",
      };
    }

    if (!input.url) {
      return {
        success: false,
        error: "URL is required.",
      };
    }

    try {
      const client = new ApifyClient({ token: apiKey });
      const actorClient = client.actor("apify/website-content-crawler");
      const crawlerType = input.crawlerType || "playwright:adaptive";

      // Prepare actor input
      const actorInput = {
        startUrls: [{ url: input.url }],
        crawlerType,
        maxCrawlDepth: 0,
        maxCrawlPages: 1,
        maxResults: 1,
        proxyConfiguration: {
          useApifyProxy: true,
        },
        removeCookieWarnings: true,
        saveMarkdown: true,
      };

      // Run synchronously and wait for completion (waits indefinitely if waitSecs not specified)
      const runData = await actorClient.call(actorInput);
      console.log("[Scrape Single URL] Actor call completed:", {
        runId: runData.id,
        status: runData.status,
        hasDataset: !!runData.defaultDatasetId,
      });

      // Get dataset items
      let markdown: string | undefined;
      if (runData.defaultDatasetId) {
        const datasetItems = await client
          .dataset(runData.defaultDatasetId)
          .listItems();

        // Extract markdown from the first item
        if (datasetItems.items && datasetItems.items.length > 0) {
          const firstItem = datasetItems.items[0] as Record<string, unknown>;
          markdown = (firstItem.markdown as string);
        }
      }

      const result: ScrapeSingleUrlResult = {
        success: true,
        runId: runData.id || "unknown",
        status: runData.status || "SUCCEEDED",
        markdown,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to scrape URL: ${getErrorMessage(error)}`,
      };
    }
  });
}
