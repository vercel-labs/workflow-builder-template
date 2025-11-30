import { Eraser, Shield } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { guardCodegenTemplate } from "./codegen/guard";
import { redactCodegenTemplate } from "./codegen/redact";
import { SuperagentSettings } from "./settings";
import { GuardConfigFields } from "./steps/guard/config";
import { RedactConfigFields } from "./steps/redact/config";
import { testSuperagent } from "./test";

const superagentPlugin: IntegrationPlugin = {
  type: "superagent",
  label: "Superagent",
  description: "Security guardrails and data redaction",

  icon: {
    type: "image",
    value: "/integrations/superagent.svg",
  },

  settingsComponent: SuperagentSettings,

  formFields: [
    {
      id: "superagentApiKey",
      label: "API Key",
      type: "password",
      placeholder: "Enter your Superagent API key",
      configKey: "superagentApiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "Superagent",
        url: "https://app.superagent.sh",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.superagentApiKey) {
      creds.SUPERAGENT_API_KEY = String(config.superagentApiKey);
    }
    return creds;
  },

  testConfig: {
    testFunction: testSuperagent,
  },

  actions: [
    {
      id: "Guard",
      label: "Guard",
      description: "Analyze text for security threats",
      category: "Superagent",
      icon: Shield,
      stepFunction: "superagentGuardStep",
      stepImportPath: "guard",
      configFields: GuardConfigFields,
      codegenTemplate: guardCodegenTemplate,
    },
    {
      id: "Redact",
      label: "Redact",
      description: "Remove sensitive data from text",
      category: "Superagent",
      icon: Eraser,
      stepFunction: "superagentRedactStep",
      stepImportPath: "redact",
      configFields: RedactConfigFields,
      codegenTemplate: redactCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(superagentPlugin);

export default superagentPlugin;
