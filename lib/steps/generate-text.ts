/**
 * Executable step function for Generate Text action
 * Uses AI Gateway with {provider}/{model} format (e.g., "openai/gpt-4")
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import { createGateway, generateObject, generateText } from "ai";
import { z } from "zod";
import { fetchCredentials } from "../credential-fetcher";
import { getErrorMessageAsync } from "../utils";

type SchemaField = {
  name: string;
  type: string;
};

type GenerateTextResult =
  | { success: true; text: string }
  | { success: true; object: Record<string, unknown> }
  | { success: false; error: string };

/**
 * Gets the full model string in provider/model format.
 * If the modelId already contains a provider prefix (e.g., "anthropic/claude-opus-4.5"),
 * it returns as-is. Otherwise, it infers the provider from the model name.
 */
function getModelString(modelId: string): string {
  // If already in provider/model format, return as-is
  if (modelId.includes("/")) {
    return modelId;
  }

  // Infer provider from model name
  if (modelId.startsWith("claude-")) {
    return `anthropic/${modelId}`;
  }
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
    return `openai/${modelId}`;
  }
  return `openai/${modelId}`; // default to openai
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
}): Promise<GenerateTextResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const modelId = input.aiModel || "gpt-5";
  const promptText = input.aiPrompt || "";

  if (!promptText || promptText.trim() === "") {
    return {
      success: false,
      error: "Prompt is required for text generation",
    };
  }

  const modelString = getModelString(modelId);

  try {
    const gateway = createGateway({
      apiKey,
    });

    if (input.aiFormat === "object" && input.aiSchema) {
      const schema = JSON.parse(input.aiSchema) as SchemaField[];
      const zodSchema = buildZodSchema(schema);

      const { object } = await generateObject({
        model: gateway(modelString),
        prompt: promptText,
        schema: zodSchema,
      });

      return { success: true, object };
    }

    const { text } = await generateText({
      model: gateway(modelString),
      prompt: promptText,
    });

    return { success: true, text };
  } catch (error) {
    // Extract meaningful error message from AI SDK errors
    const message = await getErrorMessageAsync(error);
    return {
      success: false,
      error: `Text generation failed: ${message}`,
    };
  }
}
