export async function testFal(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.FAL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "FAL_API_KEY is required",
      };
    }

    // Test with a simple API call to check credentials
    const response = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: "test",
        num_images: 1,
        image_size: "square",
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    // Check for auth errors specifically
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: "Invalid API key",
      };
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
