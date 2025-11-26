import { Mail } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendEmailCodegenTemplate } from "./codegen/send-email";
import { ResendSettings } from "./settings";
import { SendEmailConfigFields } from "./steps/send-email/config";
import { testResend } from "./test";

const resendPlugin: IntegrationPlugin = {
  type: "resend",
  label: "Resend",
  description: "Send transactional emails",

  icon: {
    type: "image",
    value: "/integrations/resend.svg",
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
    testFunction: testResend,
  },

  actions: [
    {
      id: "Send Email",
      label: "Send Email",
      description: "Send an email via Resend",
      category: "Resend",
      icon: Mail,
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      configFields: SendEmailConfigFields,
      codegenTemplate: sendEmailCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(resendPlugin);

export default resendPlugin;

