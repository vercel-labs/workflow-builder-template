const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

export async function testInstantly(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.INSTANTLY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "INSTANTLY_API_KEY is required",
      };
    }

    // Validate API key by fetching campaigns (lightweight endpoint)
    const response = await fetch(`${INSTANTLY_API_URL}/campaigns?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Instantly API key.",
        };
      }
      if (response.status === 403) {
        return {
          success: false,
          error:
            "Access denied. Please ensure your API key has the required permissions.",
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

