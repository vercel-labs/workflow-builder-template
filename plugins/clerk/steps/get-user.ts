import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClerkCredentials } from "../credentials";
import type { ClerkUser } from "../types";

type GetUserResult =
  | { success: true; user: ClerkUser }
  | { success: false; error: string };

export type ClerkGetUserCoreInput = {
  userId: string;
};

export type ClerkGetUserInput = StepInput &
  ClerkGetUserCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: ClerkGetUserCoreInput,
  credentials: ClerkCredentials
): Promise<GetUserResult> {
  const secretKey = credentials.CLERK_SECRET_KEY;

  if (!secretKey) {
    return {
      success: false,
      error:
        "CLERK_SECRET_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.userId) {
    return {
      success: false,
      error: "User ID is required.",
    };
  }

  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(input.userId)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "User-Agent": "workflow-builder.dev",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          error.errors?.[0]?.message || `Failed to get user: ${response.status}`,
      };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get user: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function clerkGetUserStep(
  input: ClerkGetUserInput
): Promise<GetUserResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
clerkGetUserStep.maxRetries = 0;

export const _integrationType = "clerk";
