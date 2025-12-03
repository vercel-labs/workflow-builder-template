import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { SuperagentCredentials } from "../credentials";

type GuardClassification = "pass" | "block";

type GuardResult = {
  classification: GuardClassification;
  violationTypes: string[];
  cweCodes: string[];
  reasoning?: string;
};

export type SuperagentGuardCoreInput = {
  text: string;
};

export type SuperagentGuardInput = StepInput &
  SuperagentGuardCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic
 */
async function stepHandler(
  input: SuperagentGuardCoreInput,
  credentials: SuperagentCredentials
): Promise<GuardResult> {
  const apiKey = credentials.SUPERAGENT_API_KEY;

  if (!apiKey) {
    throw new Error("Superagent API Key is not configured.");
  }

  try {
    const response = await fetch("https://app.superagent.sh/api/guard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: input.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Guard API error: ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (!content || typeof content !== "object") {
      throw new Error(
        "Invalid Guard API response: missing or invalid content structure"
      );
    }

    const classification = content.classification;
    if (
      !classification ||
      (classification !== "pass" && classification !== "block")
    ) {
      throw new Error(
        `Invalid Guard API response: missing or invalid classification (received: ${JSON.stringify(classification)})`
      );
    }

    return {
      classification,
      violationTypes: content?.violation_types || [],
      cweCodes: content?.cwe_codes || [],
      reasoning: choice?.message?.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to analyze text: ${getErrorMessage(error)}`);
  }
}

/**
 * Step entry point
 */
export async function superagentGuardStep(
  input: SuperagentGuardInput
): Promise<GuardResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
superagentGuardStep.maxRetries = 0;

export const _integrationType = "superagent";
