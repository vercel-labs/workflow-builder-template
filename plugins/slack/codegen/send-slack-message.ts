/**
 * Code generation template for Send Slack Message action
 */
export const sendSlackMessageCodegenTemplate = `import { WebClient } from '@slack/web-api';

export async function sendSlackMessageStep(input: {
  slackChannel: string;
  slackMessage: string;
}) {
  "use step";
  
  const slack = new WebClient(process.env.SLACK_API_KEY);
  
  const result = await slack.chat.postMessage({
    channel: input.slackChannel,
    text: input.slackMessage,
  });
  
  return result;
}`;

