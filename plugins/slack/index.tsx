import { MessageSquare } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendSlackMessageCodegenTemplate } from "./codegen/send-slack-message";
import { SlackSettings } from "./settings";
import { SendSlackMessageConfigFields } from "./steps/send-slack-message/config";

const slackPlugin: IntegrationPlugin = {
  type: "slack",
  label: "Slack",
  description: "Send messages to Slack channels",

  icon: {
    type: "image",
    value: "/integrations/slack.svg",
  },

  settingsComponent: SlackSettings,

  formFields: [
    {
      id: "apiKey",
      label: "Bot Token",
      type: "password",
      placeholder: "xoxb-...",
      configKey: "apiKey",
      helpText: "Create a Slack app and get your Bot Token from ",
      helpLink: {
        text: "api.slack.com/apps",
        url: "https://api.slack.com/apps",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apiKey) {
      creds.SLACK_API_KEY = String(config.apiKey);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testSlack } = await import("./test");
      return testSlack;
    },
  },

  actions: [
    {
      id: "Send Slack Message",
      label: "Send Slack Message",
      description: "Send a message to a Slack channel",
      category: "Slack",
      icon: MessageSquare,
      stepFunction: "sendSlackMessageStep",
      stepImportPath: "send-slack-message",
      configFields: SendSlackMessageConfigFields,
      codegenTemplate: sendSlackMessageCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(slackPlugin);

export default slackPlugin;

