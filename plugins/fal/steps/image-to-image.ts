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

type FalImageToImageResponse = {
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  error?: string;
};

type ImageToImageResult = {
  imageUrl: string;
  width?: number;
  height?: number;
};

export type FalImageToImageCoreInput = {
  model: string;
  imageUrl: string;
  prompt: string;
  strength?: string;
};

export type FalImageToImageInput = StepInput &
  FalImageToImageCoreInput & {
    integrationId?: string;
  };

async function pollForResult(
  statusUrl: string,
  responseUrl: string,
  apiKey: string
): Promise<FalImageToImageResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: HTTP ${statusResponse.status}`);
    }

    const status = (await statusResponse.json()) as FalStatusResponse;

    if (status.status === "COMPLETED") {
      const resultResponse = await fetch(responseUrl, {
        method: "GET",
        headers: { Authorization: `Key ${apiKey}` },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: HTTP ${resultResponse.status}`);
      }

      return (await resultResponse.json()) as FalImageToImageResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Request timed out waiting for fal.ai to complete");
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FalImageToImageCoreInput,
  credentials: FalCredentials
): Promise<ImageToImageResult> {
  const apiKey = credentials.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured. Please add it in Project Integrations.");
  }

  try {
    const model = input.model || "fal-ai/flux/dev/image-to-image";
    const strength = Number.parseFloat(input.strength || "0.75");

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        prompt: input.prompt,
        strength,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const queueResponse = (await response.json()) as FalQueueResponse;

    let result: FalImageToImageResponse;
    if (queueResponse.status === "IN_QUEUE" || queueResponse.status === "IN_PROGRESS") {
      result = await pollForResult(
        queueResponse.status_url,
        queueResponse.response_url,
        apiKey
      );
    } else {
      result = queueResponse as unknown as FalImageToImageResponse;
    }

    if (result.error) {
      throw new Error(result.error);
    }

    // Handle both array format (images) and single image format
    const image = result.images?.[0] || result.image;
    if (!image?.url) {
      throw new Error("No image returned from fal.ai");
    }

    return {
      imageUrl: image.url,
      width: image.width,
      height: image.height,
    };
  } catch (error) {
    throw new Error(`Failed to transform image: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function falImageToImageStep(
  input: FalImageToImageInput
): Promise<ImageToImageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
falImageToImageStep.maxRetries = 0;

export const _integrationType = "fal";
