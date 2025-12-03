const RESEND_API_URL = "https://api.resend.com";

export async function testResend(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.RESEND_API_KEY;

    if (!apiKey || !apiKey.startsWith("re_")) {
      return {
        success: false,
        error: "Invalid API key format. Resend API keys start with 're_'",
      };
    }

    // Validate API key by fetching domains (lightweight read-only endpoint)
    const response = await fetch(`${RESEND_API_URL}/domains`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Resend API key.",
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

