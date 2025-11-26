export async function testResend(credentials: Record<string, string>) {
  try {
    // Resend doesn't have a dedicated test endpoint, so we'll validate the API key format
    const apiKey = credentials.RESEND_API_KEY;
    
    if (!apiKey || !apiKey.startsWith("re_")) {
      return {
        success: false,
        error: "Invalid API key format. Resend API keys start with 're_'",
      };
    }

    // We could make a test call here, but Resend doesn't have a specific test endpoint
    // and we don't want to send actual emails during testing
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

