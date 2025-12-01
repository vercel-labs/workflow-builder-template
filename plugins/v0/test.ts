export async function testV0(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.V0_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "API key is required",
      };
    }

    // Test the API key by making a request to get user info
    const { createClient } = await import("v0-sdk");
    const client = createClient({ apiKey });
    await client.user.get();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

