function getBaseUrl(apiKey: string): string {
  // Free API keys end with ":fx"
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
}

export async function testDeepL(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.DEEPL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "DEEPL_API_KEY is required",
      };
    }

    const baseUrl = getBaseUrl(apiKey);

    // Use the usage endpoint to validate the API key
    const response = await fetch(`${baseUrl}/v2/usage`, {
      method: "GET",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "Invalid API key. Please check your DeepL API key.",
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
