import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { searchCodegenTemplate } from "./codegen/search";
import { ExaIcon } from "./icon";

const exaPlugin: IntegrationPlugin = {
  type: "exa",
  label: "Exa",
  description:
    "Semantic web search API giving AI apps fast, relevant, up-to-date results",

  icon: ExaIcon,

  formFields: [
    {
      id: "exaApiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your Exa API key",
      configKey: "exaApiKey",
      envVar: "EXA_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "Exa Dashboard",
        url: "https://dashboard.exa.ai/api-keys/",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testExa } = await import("./test");
      return testExa;
    },
  },

  dependencies: {
    "exa-js": "^1.5.12",
  },

  actions: [
    {
      slug: "search",
      label: "Search Web",
      description:
        "Perform semantic web search and retrieve relevant results with content",
      category: "Exa",
      stepFunction: "exaSearchStep",
      stepImportPath: "search",
      configFields: [
        {
          key: "query",
          label: "Search Query",
          type: "template-input",
          placeholder: "Search query or {{NodeName.query}}",
          example: "latest AI research papers",
          required: true,
        },
        {
          key: "numResults",
          label: "Number of Results",
          type: "number",
          placeholder: "10",
          min: 1,
          example: "10",
        },
        {
          key: "type",
          label: "Search Type",
          type: "select",
          options: [
            { value: "auto", label: "Auto" },
            { value: "neural", label: "Neural" },
            { value: "fast", label: "Fast" },
            { value: "deep", label: "Deep" },
          ],
          defaultValue: "auto",
        },
      ],
      codegenTemplate: searchCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(exaPlugin);

export default exaPlugin;
