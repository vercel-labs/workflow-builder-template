import "server-only";

import { createGateway, generateObject, generateText } from "ai";
import { z } from "zod";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessageAsync } from "@/lib/utils";
import type { AiGatewayCredentials } from "../credentials";

type SchemaField = {
  name: string;
  type: string;
};

type GenerateTextResult =
  | { success: true; text: string }
  | { success: true; object: Record<string, unknown> }
  | { success: false; error: string };

export type GenerateTextCoreInput = {
  aiModel?: string;
  aiPrompt?: string;
  aiFormat?: string;
  aiSchema?: string;
};

export type GenerateTextInput = StepInput &
  GenerateTextCoreInput & {
    integrationId?: string;
  };

/**
 * Gets the full model string in provider/model format.
 */
function getModelString(modelId: string): string {
  if (modelId.includes("/")) {
    return modelId;
  }

  if (modelId.startsWith("claude-")) {
    return `anthropic/${modelId}`;
  }
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
    return `openai/${modelId}`;
  }
  return `openai/${modelId}`;
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

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: GenerateTextCoreInput,
  credentials: AiGatewayCredentials
): Promise<GenerateTextResult> {
  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const modelId = input.aiModel || "meta/llama-4-scout";
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
    const message = await getErrorMessageAsync(error);
    return {
      success: false,
      error: `Text generation failed: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function generateTextStep(
  input: GenerateTextInput
): Promise<GenerateTextResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
generateTextStep.maxRetries = 0;

export const _integrationType = "ai-gateway";
