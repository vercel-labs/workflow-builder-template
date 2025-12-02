import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FalCredentials } from "../credentials";

const FAL_API_URL = "https://queue.fal.run";

type FalVideoResponse = {
  video?: {
    url: string;
  };
  error?: string;
};

type GenerateVideoResult = {
  videoUrl: string;
};

export type FalGenerateVideoCoreInput = {
  model: string;
  prompt: string;
  imageUrl?: string;
};

export type FalGenerateVideoInput = StepInput &
  FalGenerateVideoCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FalGenerateVideoCoreInput,
  credentials: FalCredentials
): Promise<GenerateVideoResult> {
  const apiKey = credentials.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured. Please add it in Project Integrations.");
  }

  try {
    const model = input.model || "fal-ai/minimax-video";

    // Build request body based on whether it's text-to-video or image-to-video
    const requestBody: Record<string, unknown> = {
      prompt: input.prompt,
    };

    if (input.imageUrl) {
      requestBody.image_url = input.imageUrl;
    }

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as FalVideoResponse;

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.video?.url) {
      throw new Error("No video returned from fal.ai");
    }

    return {
      videoUrl: result.video.url,
    };
  } catch (error) {
    throw new Error(`Failed to generate video: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function falGenerateVideoStep(
  input: FalGenerateVideoInput
): Promise<GenerateVideoResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "fal";
