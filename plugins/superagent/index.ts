import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
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
      outputFields: [
        { field: "classification", description: "Threat classification" },
        { field: "violationTypes", description: "Array of violation types" },
        { field: "cweCodes", description: "Array of CWE codes" },
        { field: "reasoning", description: "Analysis reasoning" },
      ],
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
    },
    {
      slug: "redact",
      label: "Redact",
      description:
        "Remove sensitive information (PII/PHI) like SSNs, emails, and phone numbers from text",
      category: "Superagent",
      stepFunction: "superagentRedactStep",
      stepImportPath: "redact",
      outputFields: [
        { field: "redactedText", description: "Text with PII redacted" },
        { field: "reasoning", description: "Redaction reasoning" },
      ],
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
    },
  ],
};

// Auto-register on import
registerIntegration(superagentPlugin);

export default superagentPlugin;
