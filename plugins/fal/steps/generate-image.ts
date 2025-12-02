import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FalCredentials } from "../credentials";

const FAL_API_URL = "https://queue.fal.run";

type FalImageResponse = {
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    content_type?: string;
  }>;
  error?: string;
};

type GenerateImageResult = {
  imageUrl: string;
  width?: number;
  height?: number;
};

export type FalGenerateImageCoreInput = {
  model: string;
  prompt: string;
  imageSize?: string;
  numImages?: number;
};

export type FalGenerateImageInput = StepInput &
  FalGenerateImageCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FalGenerateImageCoreInput,
  credentials: FalCredentials
): Promise<GenerateImageResult> {
  const apiKey = credentials.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured. Please add it in Project Integrations.");
  }

  try {
    const model = input.model || "fal-ai/flux/schnell";
    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: input.prompt,
        image_size: input.imageSize || "landscape_16_9",
        num_images: input.numImages || 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as FalImageResponse;

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.images || result.images.length === 0) {
      throw new Error("No images returned from fal.ai");
    }

    const image = result.images[0];
    return {
      imageUrl: image.url,
      width: image.width,
      height: image.height,
    };
  } catch (error) {
    throw new Error(`Failed to generate image: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function falGenerateImageStep(
  input: FalGenerateImageInput
): Promise<GenerateImageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "fal";
