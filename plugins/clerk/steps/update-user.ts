import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClerkCredentials } from "../credentials";

type ClerkUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
};

type UpdateUserResult =
  | { success: true; user: ClerkUser }
  | { success: false; error: string };

export type ClerkUpdateUserCoreInput = {
  userId: string;
  firstName?: string;
  lastName?: string;
  publicMetadata?: string;
  privateMetadata?: string;
};

export type ClerkUpdateUserInput = StepInput &
  ClerkUpdateUserCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: ClerkUpdateUserCoreInput,
  credentials: ClerkCredentials
): Promise<UpdateUserResult> {
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
    // Build the request body
    const body: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
      body.first_name = input.firstName;
    }
    if (input.lastName !== undefined) {
      body.last_name = input.lastName;
    }
    if (input.publicMetadata) {
      try {
        body.public_metadata = JSON.parse(input.publicMetadata);
      } catch {
        body.public_metadata = input.publicMetadata;
      }
    }
    if (input.privateMetadata) {
      try {
        body.private_metadata = JSON.parse(input.privateMetadata);
      } catch {
        body.private_metadata = input.privateMetadata;
      }
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${input.userId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "User-Agent": "workflow-builder.dev",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          error.errors?.[0]?.message ||
          `Failed to update user: ${response.status}`,
      };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update user: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function clerkUpdateUserStep(
  input: ClerkUpdateUserInput
): Promise<UpdateUserResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
clerkUpdateUserStep.maxRetries = 0;

export const _integrationType = "clerk";
