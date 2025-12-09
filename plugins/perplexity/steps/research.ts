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

type ResearchResult = {
  report: string;
  citations: string[];
  model: string;
};

export type PerplexityResearchCoreInput = {
  topic: string;
  depth?: "brief" | "detailed" | "comprehensive";
};

export type PerplexityResearchInput = StepInput &
  PerplexityResearchCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - deep research with Perplexity AI Pro model
 */
async function stepHandler(
  input: PerplexityResearchCoreInput,
  credentials: PerplexityCredentials
): Promise<ResearchResult> {
  const apiKey = credentials.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error("Perplexity API Key is not configured.");
  }

  const depthInstructions = getDepthInstructions(input.depth);

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert research analyst. Your task is to provide ${depthInstructions} research on the given topic. Structure your response with clear sections, include relevant data and statistics when available, and cite your sources. Focus on accuracy, comprehensiveness, and actionable insights.`,
          },
          {
            role: "user",
            content: `Research the following topic thoroughly: ${input.topic}`,
          },
        ],
        return_citations: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as PerplexityResponse;

    const report = result.choices[0]?.message?.content || "";
    const citations = (result.citations || []).map((c) =>
      typeof c === "string" ? c : c.url
    );

    return {
      report,
      citations,
      model: result.model,
    };
  } catch (error) {
    throw new Error(`Failed to research: ${getErrorMessage(error)}`);
  }
}

function getDepthInstructions(depth?: string): string {
  switch (depth) {
    case "brief":
      return "a concise, high-level overview with key points";
    case "comprehensive":
      return "an exhaustive, detailed analysis covering all aspects, including background, current state, key players, trends, challenges, and future outlook";
    case "detailed":
    default:
      return "a thorough analysis with detailed explanations and supporting evidence";
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function perplexityResearchStep(
  input: PerplexityResearchInput
): Promise<ResearchResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
perplexityResearchStep.maxRetries = 0;

export const _integrationType = "perplexity";
