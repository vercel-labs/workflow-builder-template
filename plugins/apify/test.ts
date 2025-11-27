export async function testApify(credentials: Record<string, string>) {
  try {
    // Test the API token by fetching user info
    const response = await fetch("https://api.apify.com/v2/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.APIFY_API_KEY}`,
      },
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
