import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type SearchResultItem = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
};

type SearchResult = {
  results: SearchResultItem[];
  totalResults?: number;
};

export type OlostepSearchInput = StepInput & {
  integrationId?: string;
  query: string;
  limit?: number;
  country?: string;
};

/**
 * Search logic using Olostep Google Search API
 */
async function search(input: OlostepSearchInput): Promise<SearchResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.OLOSTEP_API_KEY;

  if (!apiKey) {
    throw new Error("Olostep API Key is not configured.");
  }

  try {
    // Use the map endpoint with google search for web search functionality
    const params = new URLSearchParams({
      query: input.query,
      limit: String(input.limit || 10),
    });

    if (input.country) {
      params.append("country", input.country);
    }

    const response = await fetch(
      `https://api.olostep.com/v1/google-search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Olostep API error: ${errorText}`);
    }

    const result = await response.json();

    // Transform the response to a consistent format
    const results: SearchResultItem[] = (result.results || result.items || [])
      .slice(0, input.limit || 10)
      .map(
        (item: {
          url?: string;
          link?: string;
          title?: string;
          description?: string;
          snippet?: string;
          markdown?: string;
        }) => ({
          url: item.url || item.link,
          title: item.title,
          description: item.description || item.snippet,
          markdown: item.markdown,
        })
      );

    return {
      results,
      totalResults: result.total_results || results.length,
    };
  } catch (error) {
    throw new Error(`Failed to search: ${getErrorMessage(error)}`);
  }
}

/**
 * Olostep Search Step
 * Searches the web using Olostep
 */
export async function olostepSearchStep(
  input: OlostepSearchInput
): Promise<SearchResult> {
  "use step";
  return withStepLogging(input, () => search(input));
}





