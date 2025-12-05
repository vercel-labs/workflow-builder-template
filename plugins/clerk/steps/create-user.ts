import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClerkCredentials } from "../credentials";
import type { ClerkUser } from "../types";

type CreateUserResult =
  | { success: true; user: ClerkUser }
  | { success: false; error: string };

export type ClerkCreateUserCoreInput = {
  emailAddress: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  publicMetadata?: string;
  privateMetadata?: string;
};

export type ClerkCreateUserInput = StepInput &
  ClerkCreateUserCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: ClerkCreateUserCoreInput,
  credentials: ClerkCredentials
): Promise<CreateUserResult> {
  const secretKey = credentials.CLERK_SECRET_KEY;

  if (!secretKey) {
    return {
      success: false,
      error:
        "CLERK_SECRET_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.emailAddress) {
    return {
      success: false,
      error: "Email address is required.",
    };
  }

  try {
    // Build the request body
    const body: Record<string, unknown> = {
      email_address: [input.emailAddress],
    };

    if (input.firstName) {
      body.first_name = input.firstName;
    }
    if (input.lastName) {
      body.last_name = input.lastName;
    }
    if (input.password) {
      body.password = input.password;
    }
    if (input.publicMetadata) {
      try {
        body.public_metadata = JSON.parse(input.publicMetadata);
      } catch {
        return {
          success: false,
          error: "Invalid JSON format for publicMetadata",
        };
      }
    }
    if (input.privateMetadata) {
      try {
        body.private_metadata = JSON.parse(input.privateMetadata);
      } catch {
        return {
          success: false,
          error: "Invalid JSON format for privateMetadata",
        };
      }
    }

    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "User-Agent": "workflow-builder.dev",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          error.errors?.[0]?.message ||
          `Failed to create user: ${response.status}`,
      };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create user: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function clerkCreateUserStep(
  input: ClerkCreateUserInput
): Promise<CreateUserResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
clerkCreateUserStep.maxRetries = 0;

export const _integrationType = "clerk";
