export async function testBeehiiv(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.BEEHIIV_API_KEY;
    const publicationId = credentials.BEEHIIV_PUBLICATION_ID;

    if (!apiKey) {
      return {
        success: false,
        error: "BEEHIIV_API_KEY is required",
      };
    }

    if (!publicationId) {
      return {
        success: false,
        error: "BEEHIIV_PUBLICATION_ID is required",
      };
    }

    // Verify API key by fetching the publication details
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    }

    if (response.status === 404) {
      return { success: false, error: "Publication not found" };
    }

    const error = await response.text();
    return { success: false, error: error || `HTTP ${response.status}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
