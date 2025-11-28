import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type DeleteUserResult =
  | { success: true; deleted: true; id: string }
  | { success: false; error: string };

/**
 * Delete User Step
 * Deletes a user from Clerk
 */
export async function clerkDeleteUserStep(input: {
  integrationId?: string;
  userId: string;
}): Promise<DeleteUserResult> {
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
    const response = await fetch(
      `https://api.clerk.com/v1/users/${input.userId}`,
      {
        method: "DELETE",
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
        error: error.errors?.[0]?.message || `Failed to delete user: ${response.status}`,
      };
    }

    return { success: true, deleted: true, id: input.userId };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete user: ${getErrorMessage(error)}`,
    };
  }
}
