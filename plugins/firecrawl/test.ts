export async function testFirecrawl(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "FIRECRAWL_API_KEY is required",
      };
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: "https://example.com",
        formats: ["markdown"],
      }),
    });

    if (response.ok) {
      return { success: true };
    }
    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
