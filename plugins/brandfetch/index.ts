import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { BrandfetchIcon } from "./icon";

const brandfetchPlugin: IntegrationPlugin = {
  type: "brandfetch",
  label: "Brandfetch",
  description: "Get brand assets and company data",

  icon: BrandfetchIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "your-api-key",
      configKey: "apiKey",
      envVar: "BRANDFETCH_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "Brandfetch Dashboard",
        url: "https://developers.brandfetch.com/dashboard/keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testBrandfetch } = await import("./test");
      return testBrandfetch;
    },
  },

  actions: [
    {
      slug: "get-brand",
      label: "Get Brand",
      description: "Get a company's brand assets by domain, ticker, or ISIN",
      category: "Brandfetch",
      stepFunction: "getBrandStep",
      stepImportPath: "get-brand",
      outputFields: [
        { field: "name", description: "Brand name" },
        { field: "domain", description: "Brand domain" },
        { field: "description", description: "Brand description" },
        { field: "logoUrl", description: "Primary logo URL" },
        { field: "iconUrl", description: "Icon/symbol URL" },
        { field: "colors", description: "Array of brand colors (hex)" },
        { field: "links", description: "Social media and website links" },
        { field: "industry", description: "Primary industry" },
      ],
      configFields: [
        {
          key: "identifierType",
          label: "Identifier Type",
          type: "select",
          options: [
            { value: "domain", label: "Domain" },
            { value: "ticker", label: "Stock Ticker" },
            { value: "isin", label: "ISIN" },
          ],
          defaultValue: "domain",
          required: true,
        },
        {
          key: "identifier",
          label: "Identifier",
          type: "template-input",
          placeholder: "nike.com / NKE / US6541061031",
          example: "nike.com",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(brandfetchPlugin);

export default brandfetchPlugin;
