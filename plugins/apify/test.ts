import { ApifyClient } from "apify-client";

export async function testApify(credentials: Record<string, string>) {
  try {
    const client = new ApifyClient({ token: credentials.APIFY_API_TOKEN });
    await client.user("me").get();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
