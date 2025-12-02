import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { FalCredentials } from "../credentials";

const FAL_API_URL = "https://queue.fal.run";

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

    const result = (await response.json()) as FalRemoveBackgroundResponse;

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

export const _integrationType = "fal";
