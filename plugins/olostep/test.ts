export async function testOlostep(credentials: Record<string, string>) {
  try {
    const response = await fetch("https://api.olostep.com/v1/scrapes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.OLOSTEP_API_KEY}`,
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





