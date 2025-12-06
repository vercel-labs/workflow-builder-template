export async function testHunter(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.HUNTER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "HUNTER_API_KEY is required",
      };
    }

    const url = new URL("https://api.hunter.io/v2/account");
    url.searchParams.set("api_key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    }

    const error = await response.json().catch(() => ({}));
    return {
      success: false,
      error: error.errors?.[0]?.details || `API error: HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
