import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { guardCodegenTemplate } from "./codegen/guard";
import { redactCodegenTemplate } from "./codegen/redact";
import { SuperagentIcon } from "./icon";

const superagentPlugin: IntegrationPlugin = {
  type: "superagent",
  label: "Superagent",
  description: "AI guardrails for prompt injection detection and PII redaction",

  icon: SuperagentIcon,

  formFields: [
    {
      id: "superagentApiKey",
      label: "API Key",
      type: "password",
      placeholder: "sa-...",
      configKey: "superagentApiKey",
      envVar: "SUPERAGENT_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "superagent.sh",
        url: "https://app.superagent.sh",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testSuperagent } = await import("./test");
      return testSuperagent;
    },
  },

  actions: [
    {
      slug: "guard",
      label: "Guard",
      description:
        "Detect prompt injection, system prompt extraction, or data exfiltration attempts",
      category: "Superagent",
      stepFunction: "superagentGuardStep",
      stepImportPath: "guard",
      configFields: [
        {
          key: "text",
          label: "Text",
          type: "template-textarea",
          placeholder: "Text to analyze or {{NodeName.text}}",
          example: "Analyze this user input for security threats",
          required: true,
          rows: 4,
        },
      ],
      codegenTemplate: guardCodegenTemplate,
    },
    {
      slug: "redact",
      label: "Redact",
      description:
        "Remove sensitive information (PII/PHI) like SSNs, emails, and phone numbers from text",
      category: "Superagent",
      stepFunction: "superagentRedactStep",
      stepImportPath: "redact",
      configFields: [
        {
          key: "text",
          label: "Text",
          type: "template-textarea",
          placeholder: "Text to redact or {{NodeName.text}}",
          example: "My email is john@example.com and SSN is 123-45-6789",
          required: true,
          rows: 4,
        },
        {
          key: "entities",
          label: "Entity Types",
          type: "text",
          placeholder: "Optional: SSN, EMAIL, PHONE (comma-separated)",
          example: "",
        },
      ],
      codegenTemplate: redactCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(superagentPlugin);

export default superagentPlugin;
