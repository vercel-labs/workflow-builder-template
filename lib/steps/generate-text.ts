/**
 * Executable step function for Generate Text action
 * Uses AI Gateway with {provider}/{model} format (e.g., "openai/gpt-4")
 */
import "server-only";

import { generateObject, generateText } from "ai";
import { z } from "zod";

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
  aiModel?: string;
  aiPrompt?: string;
  aiFormat?: string;
  aiSchema?: string;
  apiKey: string;
}): Promise<{ text: string } | Record<string, unknown>> {
  "use step";

  // Get model and prompt from input
  const modelId = input.aiModel || "gpt-5";
  const promptText = input.aiPrompt || "";

  if (!promptText || promptText.trim() === "") {
    throw new Error("Prompt is required for text generation");
  }

  // Determine provider from model ID for AI Gateway format
  const providerName = getProviderFromModel(modelId);
  const modelString = `${providerName}/${modelId}`;

  // Handle structured output if schema is provided
  if (input.aiFormat === "object" && input.aiSchema) {
    try {
      const schema = JSON.parse(input.aiSchema) as SchemaField[];
      const zodSchema = buildZodSchema(schema);

      const { object } = await generateObject({
        model: modelString,
        prompt: promptText,
        schema: zodSchema,
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
        },
      });

      return object;
    } catch {
      // If structured output fails, fall back to text generation
    }
  }

  // Regular text generation
  const { text } = await generateText({
    model: modelString,
    prompt: promptText,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
  });

  return { text };
}
