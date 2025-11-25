/**
 * Executable step function for Generate Text action
 * Uses AI Gateway with {provider}/{model} format (e.g., "openai/gpt-4")
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import { generateObject, generateText } from "ai";
import { z } from "zod";
import { fetchCredentials } from "../credential-fetcher";

type SchemaField = {
  name: string;
  type: string;
};

/**
 * Determines the provider from the model ID
 */
function getProviderFromModel(modelId: string): string {
  if (modelId.startsWith("claude-")) {
    return "anthropic";
  }
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
    return "openai";
  }
  return "openai"; // default
}

/**
 * Builds a Zod schema from a field definition array
 */
function buildZodSchema(
  fields: SchemaField[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "string") {
      schemaShape[field.name] = z.string();
    } else if (field.type === "number") {
      schemaShape[field.name] = z.number();
    } else if (field.type === "boolean") {
      schemaShape[field.name] = z.boolean();
    }
  }

  return z.object(schemaShape);
}

export async function generateTextStep(input: {
  integrationId?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiFormat?: string;
  aiSchema?: string;
}): Promise<{ text: string } | Record<string, unknown>> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const modelId = input.aiModel || "gpt-5";
  const promptText = input.aiPrompt || "";

  if (!promptText || promptText.trim() === "") {
    throw new Error("Prompt is required for text generation");
  }

  const providerName = getProviderFromModel(modelId);
  const modelString = `${providerName}/${modelId}`;

  if (input.aiFormat === "object" && input.aiSchema) {
    try {
      const schema = JSON.parse(input.aiSchema) as SchemaField[];
      const zodSchema = buildZodSchema(schema);

      const { object } = await generateObject({
        model: modelString,
        prompt: promptText,
        schema: zodSchema,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      return object;
    } catch {
      // If structured output fails, fall back to text generation
    }
  }

  const { text } = await generateText({
    model: modelString,
    prompt: promptText,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return { text };
}
