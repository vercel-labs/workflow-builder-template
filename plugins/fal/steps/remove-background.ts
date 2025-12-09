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

type FalRemoveBackgroundResponse = {
  image?: {
    url: string;
  };
  error?: string;
};

type RemoveBackgroundResult = {
  imageUrl: string;
};

export type FalRemoveBackgroundCoreInput = {
  imageUrl: string;
};

export type FalRemoveBackgroundInput = StepInput &
  FalRemoveBackgroundCoreInput & {
    integrationId?: string;
  };

async function pollForResult(
  statusUrl: string,
  responseUrl: string,
  apiKey: string
): Promise<FalRemoveBackgroundResponse> {
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

      return (await resultResponse.json()) as FalRemoveBackgroundResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Request timed out waiting for fal.ai to complete");
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FalRemoveBackgroundCoreInput,
  credentials: FalCredentials
): Promise<RemoveBackgroundResult> {
  const apiKey = credentials.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_API_KEY is not configured. Please add it in Project Integrations.");
  }

  try {
    const response = await fetch(`${FAL_API_URL}/fal-ai/birefnet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const queueResponse = (await response.json()) as FalQueueResponse;

    let result: FalRemoveBackgroundResponse;
    if (queueResponse.status === "IN_QUEUE" || queueResponse.status === "IN_PROGRESS") {
      result = await pollForResult(
        queueResponse.status_url,
        queueResponse.response_url,
        apiKey
      );
    } else {
      result = queueResponse as unknown as FalRemoveBackgroundResponse;
    }

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.image?.url) {
      throw new Error("No image returned from fal.ai");
    }

    return {
      imageUrl: result.image.url,
    };
  } catch (error) {
    throw new Error(`Failed to remove background: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function falRemoveBackgroundStep(
  input: FalRemoveBackgroundInput
): Promise<RemoveBackgroundResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
falRemoveBackgroundStep.maxRetries = 0;

export const _integrationType = "fal";
