import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type AnswerResult = {
  answer: string;
  sources: Array<{
    url: string;
    title?: string;
  }>;
};

export type OlostepAnswerInput = StepInput & {
  integrationId?: string;
  question: string;
  urls?: string[];
  searchQuery?: string;
};

/**
 * Answer logic using Olostep API
 * Get AI-powered answers from web content
 */
async function getAnswer(input: OlostepAnswerInput): Promise<AnswerResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.OLOSTEP_API_KEY;

  if (!apiKey) {
    throw new Error("Olostep API Key is not configured.");
  }

  try {
    const requestBody: Record<string, unknown> = {
      question: input.question,
    };

    // If URLs are provided, use them as context
    if (input.urls && input.urls.length > 0) {
      requestBody.urls = input.urls;
    }

    // If search query is provided, search first
    if (input.searchQuery) {
      requestBody.search_query = input.searchQuery;
    }

    const response = await fetch("https://api.olostep.com/v1/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Olostep API error: ${errorText}`);
    }

    const result = await response.json();

    return {
      answer: result.answer || result.response || "",
      sources: (result.sources || result.references || []).map(
        (source: { url?: string; link?: string; title?: string }) => ({
          url: source.url || source.link,
          title: source.title,
        })
      ),
    };
  } catch (error) {
    throw new Error(`Failed to get answer: ${getErrorMessage(error)}`);
  }
}

/**
 * Olostep Answer Step
 * Gets AI-powered answers from web content using Olostep
 */
export async function olostepAnswerStep(
  input: OlostepAnswerInput
): Promise<AnswerResult> {
  "use step";
  return withStepLogging(input, () => getAnswer(input));
}



