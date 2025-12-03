export async function testExa(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.EXA_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "EXA_API_KEY is required",
      };
    }

    // Use a minimal search request to validate the API key
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query: "test",
        numResults: 1,
        type: "keyword",
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    }

    const error = await response.text();
    return { success: false, error: error || `API error: HTTP ${response.status}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
