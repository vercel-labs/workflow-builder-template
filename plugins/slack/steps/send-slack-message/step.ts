import "server-only";

import { WebClient } from "@slack/web-api";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type SendSlackMessageResult =
  | { success: true; ts: string; channel: string }
  | { success: false; error: string };

/**
 * Send Slack Message Step
 * Sends a message to a Slack channel
 */
export async function sendSlackMessageStep(input: {
  integrationId?: string;
  slackChannel: string;
  slackMessage: string;
}): Promise<SendSlackMessageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.SLACK_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "SLACK_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const slack = new WebClient(apiKey);

    const result = await slack.chat.postMessage({
      channel: input.slackChannel,
      text: input.slackMessage,
    });

    if (!result.ok) {
      return {
        success: false,
        error: result.error || "Failed to send Slack message",
      };
    }

    return {
      success: true,
      ts: result.ts || "",
      channel: result.channel || "",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send Slack message: ${getErrorMessage(error)}`,
    };
  }
}

