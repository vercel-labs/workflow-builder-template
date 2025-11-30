import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type GuardClassification = "allow" | "block";

type GuardResult = {
  classification: GuardClassification;
  violationTypes: string[];
  cweCodes: string[];
  reasoning?: string;
};

export type SuperagentGuardInput = StepInput & {
  integrationId?: string;
  text: string;
};

/**
 * Guard logic - analyzes text for security threats
 */
async function guard(input: SuperagentGuardInput): Promise<GuardResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

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

    return {
      classification: content?.classification || "allow",
      violationTypes: content?.violation_types || [],
      cweCodes: content?.cwe_codes || [],
      reasoning: choice?.message?.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to analyze text: ${getErrorMessage(error)}`);
  }
}

/**
 * Superagent Guard Step
 * Analyzes text for security threats like prompt injection
 */
export async function superagentGuardStep(
  input: SuperagentGuardInput
): Promise<GuardResult> {
  "use step";
  return withStepLogging(input, () => guard(input));
}
