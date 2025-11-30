import { Mail } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendEmailCodegenTemplate } from "./codegen/send-email";
import { ResendIcon } from "./icon";
import { ResendSettings } from "./settings";
import { SendEmailConfigFields } from "./steps/send-email/config";

const resendPlugin: IntegrationPlugin = {
  type: "resend",
  label: "Resend",
  description: "Send transactional emails",

  icon: {
    type: "svg",
    value: "ResendIcon",
    svgComponent: ResendIcon,
  },

  settingsComponent: ResendSettings,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "re_...",
      configKey: "apiKey",
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
      helpText: "The email address that will appear as the sender",
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apiKey) {
      creds.RESEND_API_KEY = String(config.apiKey);
    }
    if (config.fromEmail) {
      creds.RESEND_FROM_EMAIL = String(config.fromEmail);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testResend } = await import("./test");
      return testResend;
    },
  },

  dependencies: {
    resend: "^6.4.0",
  },

  envVars: [
    { name: "RESEND_API_KEY", description: "Resend API key for sending emails" },
    { name: "RESEND_FROM_EMAIL", description: "Default sender email address" },
  ],

  actions: [
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email via Resend",
      category: "Resend",
      icon: Mail,
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      configFields: SendEmailConfigFields,
      codegenTemplate: sendEmailCodegenTemplate,
      aiPrompt: `{"actionType": "resend/send-email", "emailTo": "user@example.com", "emailSubject": "Subject", "emailBody": "Body"}`,
    },
  ],
};

// Auto-register on import
registerIntegration(resendPlugin);

export default resendPlugin;

