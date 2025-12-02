import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { PerplexityCredentials } from "../credentials";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

type PerplexityMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type PerplexityCitation = {
  url: string;
  text?: string;
};

type PerplexityResponse = {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: PerplexityMessage;
    finish_reason: string;
  }>;
  citations?: PerplexityCitation[] | string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type AskResult = {
  answer: string;
  citations: string[];
  model: string;
};

export type PerplexityAskCoreInput = {
  question: string;
  systemPrompt?: string;
  model?: string;
};

export type PerplexityAskInput = StepInput &
  PerplexityAskCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - ask a question with Perplexity AI
 */
async function stepHandler(
  input: PerplexityAskCoreInput,
  credentials: PerplexityCredentials
): Promise<AskResult> {
  const apiKey = credentials.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error("Perplexity API Key is not configured.");
  }

  try {
    const messages: PerplexityMessage[] = [];

    if (input.systemPrompt) {
      messages.push({
        role: "system",
        content: input.systemPrompt,
      });
    } else {
      messages.push({
        role: "system",
        content:
          "You are a helpful AI assistant. Provide accurate, well-researched answers with citations when available.",
      });
    }

    messages.push({
      role: "user",
      content: input.question,
    });

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: input.model || "sonar",
        messages,
        return_citations: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as PerplexityResponse;

    const answer = result.choices[0]?.message?.content || "";
    const citations = (result.citations || []).map((c) =>
      typeof c === "string" ? c : c.url
    );

    return {
      answer,
      citations,
      model: result.model,
    };
  } catch (error) {
    throw new Error(`Failed to ask: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function perplexityAskStep(
  input: PerplexityAskInput
): Promise<AskResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "perplexity";
