import { WebClient } from "@slack/web-api";

export async function testSlack(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.SLACK_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SLACK_API_KEY is required",
      };
    }

    // Test the Slack API by calling auth.test
    const slack = new WebClient(apiKey);
    const result = await slack.auth.test();

    if (!result.ok) {
      return {
        success: false,
        error: "Invalid Slack Bot Token",
      };
    }

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

