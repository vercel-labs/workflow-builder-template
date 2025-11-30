import "server-only";

import type { ImageModelV2 } from "@ai-sdk/provider";
import {
  createGateway,
  experimental_generateImage as generateImage,
} from "ai";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessageAsync } from "@/lib/utils";

type GenerateImageResult =
  | { success: true; base64: string }
  | { success: false; error: string };

export type GenerateImageInput = StepInput & {
  integrationId?: string;
  imageModel: ImageModelV2;
  imagePrompt: string;
};

/**
 * Generate image logic
 */
async function generateImageLogic(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
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

  try {
    const gateway = createGateway({
      apiKey,
    });

    // biome-ignore lint/suspicious/noExplicitAny: AI gateway model ID is dynamic
    const modelId = (input.imageModel ?? "google/imagen-4.0-generate") as any;
    const result = await generateImage({
      model: gateway.imageModel(modelId),
      prompt: input.imagePrompt,
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
 * Generate Image Step
 * Uses AI Gateway to generate images
 */
export async function generateImageStep(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  "use step";
  return withStepLogging(input, () => generateImageLogic(input));
}
