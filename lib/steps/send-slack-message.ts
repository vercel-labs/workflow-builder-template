/**
 * Executable step function for Send Slack Message action
 */
import "server-only";

import { WebClient } from "@slack/web-api";

export async function sendSlackMessageStep(input: {
  slackChannel: string;
  slackMessage: string;
  apiKey: string;
}) {
  "use step";

  const slack = new WebClient(input.apiKey);

  const result = await slack.chat.postMessage({
    channel: input.slackChannel,
    text: input.slackMessage,
  });

  return result;
}
