const STRIPE_API_URL = "https://api.stripe.com/v1";

export async function testStripe(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.STRIPE_SECRET_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "STRIPE_SECRET_KEY is required",
      };
    }

    if (!apiKey.startsWith("sk_")) {
      return {
        success: false,
        error:
          "Invalid API key format. Stripe secret keys start with 'sk_live_' or 'sk_test_'",
      };
    }

    // Validate API key by fetching balance (lightweight read-only endpoint)
    const response = await fetch(`${STRIPE_API_URL}/balance`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Stripe secret key.",
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

