/**
 * Code generation template for Scrape Single URL action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const scrapeSingleUrlCodegenTemplate = `import { ApifyClient } from "apify-client";

export async function scrapeSingleUrlStep(input: {
  url: string;
  crawlerType?: string;
}) {
  "use step";

  const apiKey = process.env.APIFY_API_TOKEN;

  if (!apiKey) {
    throw new Error("Apify API Token is not configured. Set APIFY_API_TOKEN environment variable.");
  }

  if (!input.url) {
    throw new Error("URL is required.");
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

    // Run synchronously and wait for completion
    const runData = await actorClient.call(actorInput);

    // Get dataset items
    let markdown: string | undefined;
    if (runData.defaultDatasetId) {
      const datasetItems = await client
        .dataset(runData.defaultDatasetId)
        .listItems();

      // Extract markdown from the first item
      if (datasetItems.items && datasetItems.items.length > 0) {
        const firstItem = datasetItems.items[0] as Record<string, unknown>;
        markdown = firstItem.markdown as string;
      }
    }

    return {
      runId: runData.id || "unknown",
      status: runData.status || "SUCCEEDED",
      markdown,
    };
  } catch (error) {
    throw new Error(\`Failed to scrape URL: \${error instanceof Error ? error.message : String(error)}\`);
  }
}`;
