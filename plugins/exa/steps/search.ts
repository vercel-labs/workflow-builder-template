import "server-only";

import Exa from "exa-js";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type ExaSearchResult = {
  results: Array<{
    url: string;
    title: string | null;
    publishedDate?: string;
    author?: string;
    text?: string;
  }>;
};

export type ExaSearchInput = StepInput & {
  integrationId?: string;
  query: string;
  numResults?: number;
  type?: "auto" | "neural" | "fast" | "deep";
};

/**
 * Search logic using Exa SDK
 */
async function search(input: ExaSearchInput): Promise<ExaSearchResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.EXA_API_KEY;

  if (!apiKey) {
    throw new Error("Exa API Key is not configured.");
  }

  try {
    const exa = new Exa(apiKey);

    const result = await exa.search(input.query, {
      numResults: input.numResults ? Number(input.numResults) : 10,
      type: input.type || "auto",
    });

    return {
      results: result.results.map((r) => ({
        url: r.url,
        title: r.title,
        publishedDate: r.publishedDate,
        author: r.author,
        text: r.text,
      })),
    };
  } catch (error) {
    throw new Error(`Failed to search: ${getErrorMessage(error)}`);
  }
}

/**
 * Exa Search Step
 * Performs semantic web search using Exa
 */
export async function exaSearchStep(
  input: ExaSearchInput
): Promise<ExaSearchResult> {
  "use step";
  return withStepLogging(input, () => search(input));
}
