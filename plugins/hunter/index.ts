import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { HunterIcon } from "./icon";

const hunterPlugin: IntegrationPlugin = {
  type: "hunter",
  label: "Hunter",
  description: "All-in-one email outreach platform",
  icon: HunterIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      configKey: "apiKey",
      envVar: "HUNTER_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "hunter.io/api-keys",
        url: "https://hunter.io/api-keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testHunter } = await import("./test");
      return testHunter;
    },
  },

  actions: [
    {
      slug: "enrich-lead",
      label: "Enrich Lead",
      description: "Get data on a lead and their company",
      category: "Hunter",
      stepFunction: "enrichLeadStep",
      stepImportPath: "enrich-lead",
      configFields: [
        {
          key: "email",
          label: "Lead Email",
          type: "template-input",
          placeholder: "{{Trigger.email}} or john@example.com",
          example: "john@example.com",
          required: true,
        },
        {
          key: "enrichmentType",
          label: "Enrichment Type",
          type: "select",
          options: [
            { value: "individual", label: "Individual" },
            { value: "company", label: "Company" },
            { value: "combined", label: "Combined" },
          ],
          defaultValue: "combined",
        },
      ],
    },
  ],
};

registerIntegration(hunterPlugin);

export default hunterPlugin;
