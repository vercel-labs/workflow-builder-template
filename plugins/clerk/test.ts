export async function testClerk(credentials: Record<string, string>) {
  try {
    const secretKey = credentials.CLERK_SECRET_KEY;

    if (!secretKey) {
      return {
        success: false,
        error: "Secret key is required",
      };
    }

    // Validate format - Clerk secret keys start with sk_live_ or sk_test_
    if (
      !secretKey.startsWith("sk_live_") &&
      !secretKey.startsWith("sk_test_")
    ) {
      return {
        success: false,
        error:
          "Invalid secret key format. Clerk secret keys start with 'sk_live_' or 'sk_test_'",
      };
    }

    // Test the connection by fetching users list (limit 1)
    const response = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "User-Agent": "workflow-builder.dev",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.errors?.[0]?.message || `API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
