export async function testOlostep(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.OLOSTEP_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "OLOSTEP_API_KEY is required",
      };
    }

    const response = await fetch("https://api.olostep.com/v1/scrapes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url_to_scrape: "https://example.com",
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





