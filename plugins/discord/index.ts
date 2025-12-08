import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { DiscordIcon } from "./icon";

const discordPlugin: IntegrationPlugin = {
  type: "discord",
  label: "Discord",
  description: "Send messages to Discord channels via webhooks",

  icon: DiscordIcon,

  // No credentials needed - users provide webhook URL directly in each step
  formFields: [
    {
      id: "info",
      label: "Discord Webhooks",
      type: "text",
      placeholder: "No configuration needed",
      configKey: "info",
      helpText: "Provide webhook URLs directly in each Discord action. Learn how to create webhooks at ",
      helpLink: {
        text: "support.discord.com",
        url: "https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks",
      },
    },
  ],

  // No test function needed since there are no credentials to test
  // Users provide webhook URL per-step

  actions: [
    {
      slug: "send-message",
      label: "Send Discord Message",
      description: "Send a message to a Discord channel via webhook",
      category: "Discord",
      stepFunction: "sendDiscordMessageStep",
      stepImportPath: "send-message",
      outputFields: [
        { field: "success", description: "Whether the message was sent" },
        { field: "messageId", description: "Discord message ID" },
        { field: "error", description: "Error message if failed" },
      ],
      configFields: [
        {
          key: "discordWebhookUrl",
          label: "Webhook URL",
          type: "template-input",
          placeholder: "https://discord.com/api/webhooks/... or {{NodeName.webhookUrl}}",
          example: "https://discord.com/api/webhooks/123456789/abcdef",
          required: true,
        },
        {
          key: "discordMessage",
          label: "Message",
          type: "template-textarea",
          placeholder: "Your message. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "Hello from my workflow!",
          required: true,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(discordPlugin);

export default discordPlugin;
