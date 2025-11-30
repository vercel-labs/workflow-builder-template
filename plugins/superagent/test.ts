export async function testSuperagent(credentials: Record<string, string>) {
  try {
    const response = await fetch("https://app.superagent.sh/api/guard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.SUPERAGENT_API_KEY}`,
      },
      body: JSON.stringify({
        text: "Hello, this is a test message.",
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
