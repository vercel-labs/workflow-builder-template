import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type ClerkUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  primary_email_address_id: string | null;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
};

type UpdateUserResult =
  | { success: true; user: ClerkUser }
  | { success: false; error: string };

/**
 * Update User Step
 * Updates an existing user in Clerk
 */
export async function clerkUpdateUserStep(input: {
  integrationId?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  publicMetadata?: string;
  privateMetadata?: string;
}): Promise<UpdateUserResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

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
      error: "User ID is required. Example: {{@node-id:Node Label.user.id}}",
    };
  }

  try {
    const body: Record<string, unknown> = {};

    if (input.firstName !== undefined && input.firstName !== "") {
      body.first_name = input.firstName;
    }
    if (input.lastName !== undefined && input.lastName !== "") {
      body.last_name = input.lastName;
    }
    if (input.publicMetadata) {
      try {
        body.public_metadata = JSON.parse(input.publicMetadata);
      } catch {
        return {
          success: false,
          error: "Invalid JSON in public metadata",
        };
      }
    }
    if (input.privateMetadata) {
      try {
        body.private_metadata = JSON.parse(input.privateMetadata);
      } catch {
        return {
          success: false,
          error: "Invalid JSON in private metadata",
        };
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
        error: error.errors?.[0]?.message || `Failed to update user: ${response.status}`,
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
