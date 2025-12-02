import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { SlackIcon } from "./icon";

const slackPlugin: IntegrationPlugin = {
  type: "slack",
  label: "Slack",
  description: "Send messages to Slack channels",

  icon: SlackIcon,

  formFields: [
    {
      id: "apiKey",
      label: "Bot Token",
      type: "password",
      placeholder: "xoxb-...",
      configKey: "apiKey",
      envVar: "SLACK_API_KEY",
      helpText: "Create a Slack app and get your Bot Token from ",
      helpLink: {
        text: "api.slack.com/apps",
        url: "https://api.slack.com/apps",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testSlack } = await import("./test");
      return testSlack;
    },
  },

  actions: [
    {
      slug: "send-message",
      label: "Send Slack Message",
      description: "Send a message to a Slack channel",
      category: "Slack",
      stepFunction: "sendSlackMessageStep",
      stepImportPath: "send-slack-message",
      outputFields: [
        { field: "ts", description: "Message timestamp" },
        { field: "channel", description: "Channel ID" },
      ],
      configFields: [
        {
          key: "slackChannel",
          label: "Channel",
          type: "text",
          placeholder: "#general or {{NodeName.channel}}",
          example: "#general",
          required: true,
        },
        {
          key: "slackMessage",
          label: "Message",
          type: "template-textarea",
          placeholder:
            "Your message. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "Hello from my workflow!",
          required: true,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(slackPlugin);

export default slackPlugin;
