const SENDGRID_API_URL = "https://api.sendgrid.com";

export async function testSendGrid(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.SENDGRID_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SENDGRID_API_KEY is not configured",
      };
    }

    // Validate API key by fetching user profile (lightweight read-only endpoint)
    const response = await fetch(`${SENDGRID_API_URL}/v3/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your SendGrid API key.",
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

