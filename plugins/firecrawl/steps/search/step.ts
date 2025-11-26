import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Firecrawl Search Step
 * Searches the web using Firecrawl
 */
export async function firecrawlSearchStep(input: {
  integrationId?: string;
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  };
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Firecrawl API Key is not configured.",
    };
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.search(input.query, {
      limit: input.limit ? Number(input.limit) : undefined,
      scrapeOptions: input.scrapeOptions,
    });

    // Return web results directly for easier access
    // e.g., {{Search.web[0].title}}, {{Search.web[0].url}}
    return {
      web: result.web,
    };
  } catch (error) {
    throw new Error(`Failed to search: ${getErrorMessage(error)}`);
  }
}

