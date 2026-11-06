const BRANDFETCH_API_URL = "https://api.brandfetch.io/v2";

export async function testBrandfetch(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.BRANDFETCH_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "BRANDFETCH_API_KEY is required",
      };
    }

    // Use brandfetch.com domain for testing (free and doesn't count against quota)
    const response = await fetch(`${BRANDFETCH_API_URL}/brands/brandfetch.com`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Brandfetch API key.",
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
