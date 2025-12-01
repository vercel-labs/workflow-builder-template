const SLACK_API_URL = "https://slack.com/api";

type SlackAuthTestResponse = {
  ok: boolean;
  error?: string;
};

export async function testSlack(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.SLACK_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SLACK_API_KEY is required",
      };
    }

    const response = await fetch(`${SLACK_API_URL}/auth.test`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    const result = (await response.json()) as SlackAuthTestResponse;

    if (!result.ok) {
      return {
        success: false,
        error: result.error || "Invalid Slack Bot Token",
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

