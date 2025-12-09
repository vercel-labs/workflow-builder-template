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

type FalUpscaleResponse = {
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  error?: string;
};

type UpscaleImageResult = {
  imageUrl: string;
  width?: number;
  height?: number;
};

export type FalUpscaleImageCoreInput = {
  model: string;
  imageUrl: string;
  scale?: string;
};

export type FalUpscaleImageInput = StepInput &
  FalUpscaleImageCoreInput & {
    integrationId?: string;
  };

async function pollForResult(
  statusUrl: string,
  responseUrl: string,
  apiKey: string
): Promise<FalUpscaleResponse> {
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

      return (await resultResponse.json()) as FalUpscaleResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Request timed out waiting for fal.ai to complete");
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FalUpscaleImageCoreInput,
  credentials: FalCredentials
): Promise<UpscaleImageResult> {
  const apiKey = credentials.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured. Please add it in Project Integrations.");
  }

  try {
    const model = input.model || "fal-ai/creative-upscaler";
    const scale = Number.parseInt(input.scale || "2", 10);

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        scale,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const queueResponse = (await response.json()) as FalQueueResponse;

    let result: FalUpscaleResponse;
    if (queueResponse.status === "IN_QUEUE" || queueResponse.status === "IN_PROGRESS") {
      result = await pollForResult(
        queueResponse.status_url,
        queueResponse.response_url,
        apiKey
      );
    } else {
      result = queueResponse as unknown as FalUpscaleResponse;
    }

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.image?.url) {
      throw new Error("No image returned from fal.ai");
    }

    return {
      imageUrl: result.image.url,
      width: result.image.width,
      height: result.image.height,
    };
  } catch (error) {
    throw new Error(`Failed to upscale image: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function falUpscaleImageStep(
  input: FalUpscaleImageInput
): Promise<UpscaleImageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
falUpscaleImageStep.maxRetries = 0;

export const _integrationType = "fal";
