import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { SendGridIcon } from "./icon";

const sendgridPlugin: IntegrationPlugin = {
  type: "sendgrid",
  label: "Email",
  description: "Send transactional emails",

  icon: SendGridIcon,

  // No integration required - uses KeeperHub SendGrid API key by default
  requiresIntegration: false,

  formFields: [
    {
      id: "useKeeperHubApiKey",
      label: "Use KeeperHub SendGrid API Key",
      type: "checkbox",
      configKey: "useKeeperHubApiKey",
      defaultValue: true,
      helpText: "When checked, uses the KeeperHub SendGrid API key. Uncheck to use your own API key.",
    },
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "SG....",
      configKey: "apiKey",
      envVar: "SENDGRID_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "sendgrid.com/api-keys",
        url: "https://app.sendgrid.com/settings/api_keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testSendGrid } = await import("./test");
      return testSendGrid;
    },
  },

  actions: [
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email via SendGrid",
      category: "Email",
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      outputFields: [{ field: "id", description: "Email ID" }],
      configFields: [
        {
          key: "emailTo",
          label: "To",
          type: "template-input",
          placeholder: "recipient@example.com",
          example: "user@example.com",
          required: true,
        },
        {
          key: "emailSubject",
          label: "Subject",
          type: "template-input",
          placeholder: "Subject or {{NodeName.title}}",
          example: "Hello from my workflow",
          required: true,
        },
        {
          key: "emailBody",
          label: "Body",
          type: "template-textarea",
          placeholder: "Email content or {{NodeName.description}}",
          rows: 5,
          example: "This is the email body content.",
          required: true,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(sendgridPlugin);

export default sendgridPlugin;

