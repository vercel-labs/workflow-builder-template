import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ExaCredentials } from "../credentials";

const EXA_API_URL = "https://api.exa.ai";

type ExaSearchResponse = {
  results: Array<{
    url: string;
    id: string;
    title: string | null;
    publishedDate?: string;
    author?: string;
    text?: string;
  }>;
  autopromptString?: string;
};

type ExaErrorResponse = {
  error?: string;
  message?: string;
};

type SearchResult =
  | {
      success: true;
      results: Array<{
        url: string;
        title: string | null;
        publishedDate?: string;
        author?: string;
        text?: string;
      }>;
    }
  | { success: false; error: string };

export type SearchCoreInput = {
  query: string;
  numResults?: number;
  type?: "auto" | "neural" | "keyword";
};

export type ExaSearchInput = StepInput &
  SearchCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SearchCoreInput,
  credentials: ExaCredentials
): Promise<SearchResult> {
  const apiKey = credentials.EXA_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "EXA_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const response = await fetch(`${EXA_API_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query: input.query,
        numResults: input.numResults ? Number(input.numResults) : 10,
        type: input.type || "auto",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ExaErrorResponse;
      return {
        success: false,
        error:
          errorData.error ||
          errorData.message ||
          `HTTP ${response.status}: Search failed`,
      };
    }

    const data = (await response.json()) as ExaSearchResponse;

    return {
      success: true,
      results: data.results.map((r) => ({
        url: r.url,
        title: r.title,
        publishedDate: r.publishedDate,
        author: r.author,
        text: r.text,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to search: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function exaSearchStep(
  input: ExaSearchInput
): Promise<SearchResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

// Export marker for codegen auto-generation
export const _integrationType = "exa";
