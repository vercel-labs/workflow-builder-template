import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendEmailCodegenTemplate } from "./codegen/send-email";
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
      label: "From Email",
      type: "text",
      placeholder: "noreply@yourdomain.com",
      configKey: "fromEmail",
      envVar: "RESEND_FROM_EMAIL",
      helpText: "The email address that will appear as the sender",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testResend } = await import("./test");
      return testResend;
    },
  },

  dependencies: {
    resend: "^6.4.0",
  },

  actions: [
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email via Resend",
      category: "Resend",
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      configFields: [
        {
          key: "emailTo",
          label: "To (Email Address)",
          type: "template-input",
          placeholder: "user@example.com or {{NodeName.email}}",
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
      codegenTemplate: sendEmailCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(resendPlugin);

export default resendPlugin;
