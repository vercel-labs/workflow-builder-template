import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type RedactResult = {
  redactedText: string;
  reasoning?: string;
};

export type SuperagentRedactInput = StepInput & {
  integrationId?: string;
  text: string;
  entities?: string[] | string;
};

/**
 * Redact logic - removes sensitive information from text
 */
async function redact(input: SuperagentRedactInput): Promise<RedactResult> {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.SUPERAGENT_API_KEY;

  if (!apiKey) {
    throw new Error("Superagent API Key is not configured.");
  }

  try {
    const body: { text: string; entities?: string[] } = {
      text: input.text,
    };

    // Parse entities from string or array, filter out empty strings
    if (input.entities) {
      let entitiesArray: string[];
      
      if (typeof input.entities === "string") {
        // Parse comma-separated string
        entitiesArray = input.entities.split(",").map((e) => e.trim());
      } else if (Array.isArray(input.entities)) {
        entitiesArray = input.entities.map((e) => String(e).trim());
      } else {
        entitiesArray = [];
      }
      
      // Filter out empty strings and ensure we have valid entities
      const validEntities = entitiesArray.filter((e) => e.length > 0);
      
      if (validEntities.length > 0) {
        body.entities = validEntities;
      }
    }

    const response = await fetch("https://app.superagent.sh/api/redact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Redact API error: ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      redactedText: choice?.message?.content || input.text,
      reasoning: choice?.message?.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to redact text: ${getErrorMessage(error)}`);
  }
}

/**
 * Superagent Redact Step
 * Removes sensitive information (PII/PHI) from text
 */
export async function superagentRedactStep(
  input: SuperagentRedactInput
): Promise<RedactResult> {
  "use step";
  return withStepLogging(input, () => redact(input));
}
