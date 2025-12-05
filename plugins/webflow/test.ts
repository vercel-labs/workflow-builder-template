const WEBFLOW_API_URL = "https://api.webflow.com/v2";

export async function testWebflow(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.WEBFLOW_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "WEBFLOW_API_KEY is required",
      };
    }

    // Use the list sites endpoint to validate the API key
    const response = await fetch(`${WEBFLOW_API_URL}/sites`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Webflow API token.",
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
