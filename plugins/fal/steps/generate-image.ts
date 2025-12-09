import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FalCredentials } from "../credentials";

const FAL_API_URL = "https://queue.fal.run";
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 600; // 10 minutes max

type FalQueueResponse = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  request_id: string;
  response_url: string;
  status_url: string;
};

type FalStatusResponse = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  response_url?: string;
};

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
 * Poll fal.ai queue until the request is completed
 */
async function pollForResult(
  statusUrl: string,
  responseUrl: string,
  apiKey: string
): Promise<FalImageResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Key ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: HTTP ${statusResponse.status}`);
    }

    const status = (await statusResponse.json()) as FalStatusResponse;

    if (status.status === "COMPLETED") {
      // Fetch the actual result
      const resultResponse = await fetch(responseUrl, {
        method: "GET",
        headers: {
          Authorization: `Key ${apiKey}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: HTTP ${resultResponse.status}`);
      }

      return (await resultResponse.json()) as FalImageResponse;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Request timed out waiting for fal.ai to complete");
}

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

    const queueResponse = (await response.json()) as FalQueueResponse;

    // If the response is queued, poll for the result
    let result: FalImageResponse;
    if (queueResponse.status === "IN_QUEUE" || queueResponse.status === "IN_PROGRESS") {
      result = await pollForResult(
        queueResponse.status_url,
        queueResponse.response_url,
        apiKey
      );
    } else {
      // Immediate response (shouldn't happen with queue endpoint, but handle it)
      result = queueResponse as unknown as FalImageResponse;
    }

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
falGenerateImageStep.maxRetries = 0;

export const _integrationType = "fal";
