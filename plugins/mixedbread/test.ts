export async function testMixedbread(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.MIXEDBREAD_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "MIXEDBREAD_API_KEY is required",
      };
    }

    // Make a lightweight API call to validate the key
    const response = await fetch("https://api.mixedbread.com/v1/stores", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    }

    const error = await response.text();
    return { success: false, error: `API error: ${error}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
