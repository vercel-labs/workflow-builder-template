import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { ResendIcon } from "./icon";

const resendPlugin: IntegrationPlugin = {
  type: "resend",
  label: "Resend",
  description: "Send transactional emails",

  icon: ResendIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "re_...",
      configKey: "apiKey",
      envVar: "RESEND_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "resend.com/api-keys",
        url: "https://resend.com/api-keys",
      },
    },
    {
      id: "fromEmail",
      label: "Default Sender",
      type: "text",
      placeholder: "Your Name <noreply@yourdomain.com>",
      configKey: "fromEmail",
      envVar: "RESEND_FROM_EMAIL",
      helpText: "The name and email that will appear as the sender",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testResend } = await import("./test");
      return testResend;
    },
  },

  actions: [
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email via Resend",
      category: "Resend",
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      outputFields: [{ field: "id", description: "Email ID" }],
      configFields: [
        {
          key: "emailFrom",
          label: "From (Sender)",
          type: "template-input",
          placeholder: "Your Name <noreply@example.com>",
          example: "Support <support@example.com>",
        },
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
        {
          type: "group",
          label: "Additional Recipients",
          fields: [
            {
              key: "emailCc",
              label: "CC",
              type: "template-input",
              placeholder: "cc@example.com",
              example: "manager@example.com",
            },
            {
              key: "emailBcc",
              label: "BCC",
              type: "template-input",
              placeholder: "bcc@example.com",
              example: "archive@example.com",
            },
            {
              key: "emailReplyTo",
              label: "Reply-To",
              type: "template-input",
              placeholder: "reply@example.com",
              example: "support@example.com",
            },
          ],
        },
        {
          type: "group",
          label: "Scheduling",
          fields: [
            {
              key: "emailScheduledAt",
              label: "Schedule At (ISO 8601)",
              type: "template-input",
              placeholder: "2024-12-25T09:00:00Z",
              example: "2024-12-25T09:00:00Z",
            },
            {
              key: "emailTopicId",
              label: "Topic ID",
              type: "template-input",
              placeholder: "topic_abc123",
              example: "topic_abc123",
            },
          ],
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(resendPlugin);

export default resendPlugin;
