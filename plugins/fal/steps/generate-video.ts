import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FalCredentials } from "../credentials";

const FAL_API_URL = "https://queue.fal.run";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // 10 minutes max for video

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
 * Poll fal.ai queue until the request is completed
 */
async function pollForResult(
  statusUrl: string,
  responseUrl: string,
  apiKey: string
): Promise<FalVideoResponse> {
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
      const resultResponse = await fetch(responseUrl, {
        method: "GET",
        headers: {
          Authorization: `Key ${apiKey}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: HTTP ${resultResponse.status}`);
      }

      return (await resultResponse.json()) as FalVideoResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Request timed out waiting for fal.ai to complete");
}

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

    const queueResponse = (await response.json()) as FalQueueResponse;

    let result: FalVideoResponse;
    if (queueResponse.status === "IN_QUEUE" || queueResponse.status === "IN_PROGRESS") {
      result = await pollForResult(
        queueResponse.status_url,
        queueResponse.response_url,
        apiKey
      );
    } else {
      result = queueResponse as unknown as FalVideoResponse;
    }

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
falGenerateVideoStep.maxRetries = 0;

export const _integrationType = "fal";
