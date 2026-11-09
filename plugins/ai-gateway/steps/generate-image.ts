import "server-only";

import { createGateway, generateImage } from "ai";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessageAsync } from "@/lib/utils";
import type { AiGatewayCredentials } from "../credentials";

type GenerateImageResult =
  | { success: true; base64: string }
  | { success: false; error: string };

export type GenerateImageCoreInput = {
  imageModel?: string;
  imagePrompt?: string;
};

export type GenerateImageInput = StepInput &
  GenerateImageCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: GenerateImageCoreInput,
  credentials: AiGatewayCredentials
): Promise<GenerateImageResult> {
  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const modelId = input.imageModel || "google/imagen-4.0-generate-001";
  const promptText = input.imagePrompt || "";

  if (!promptText || promptText.trim() === "") {
    return {
      success: false,
      error: "Prompt is required for image generation",
    };
  }

  try {
    const gateway = createGateway({
      apiKey,
    });
    const result = await generateImage({
      // biome-ignore lint/suspicious/noExplicitAny: AI gateway model ID is dynamic
      model: gateway.imageModel(modelId as any),
      prompt: promptText,
      size: "1024x1024",
    });

    if (!result.image) {
      return {
        success: false,
        error: "Failed to generate image: No image returned",
      };
    }

    const base64 = result.image.base64;

    return { success: true, base64 };
  } catch (error) {
    const message = await getErrorMessageAsync(error);
    return {
      success: false,
      error: `Image generation failed: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function generateImageStep(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
generateImageStep.maxRetries = 0;

export const _integrationType = "ai-gateway";
