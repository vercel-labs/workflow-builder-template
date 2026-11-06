const DUB_API_URL = "https://api.dub.co";

export async function testDub(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.DUB_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "DUB_API_KEY is required",
      };
    }

    // Use the links endpoint to validate the API key
    const response = await fetch(`${DUB_API_URL}/links?page=1&pageSize=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Dub API key.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
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
