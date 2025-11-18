/**
 * Executable step function for Send Slack Message action
 */
import { WebClient } from "@slack/web-api";

export async function sendSlackMessageStep(input: {
  slackChannel: string;
  slackMessage: string;
  apiKey: string;
}) {
  const slack = new WebClient(input.apiKey);

  const result = await slack.chat.postMessage({
    channel: input.slackChannel,
    text: input.slackMessage,
  });

  console.log("Slack message sent:", result);
  return result;
}
