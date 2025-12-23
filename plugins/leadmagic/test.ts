const LEADMAGIC_API_URL = "https://api.leadmagic.io";

export async function testLeadMagic(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.LEADMAGIC_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "API key is required",
      };
    }

    const response = await fetch(`${LEADMAGIC_API_URL}/v1/credits`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your LeadMagic API key.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { credits?: number };
    return {
      success: true,
      message: `Connected. ${data.credits ?? 0} credits available.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
