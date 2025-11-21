/**
 * Executable step function for Send Slack Message action
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import { WebClient } from "@slack/web-api";
import { fetchCredentials } from "../credential-fetcher";

export async function sendSlackMessageStep(input: {
  integrationId?: string;
  slackChannel: string;
  slackMessage: string;
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.SLACK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SLACK_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const slack = new WebClient(apiKey);

  const result = await slack.chat.postMessage({
    channel: input.slackChannel,
    text: input.slackMessage,
  });

  return result;
}
