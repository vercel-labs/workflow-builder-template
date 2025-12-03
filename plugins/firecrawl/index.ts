import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { FirecrawlIcon } from "./icon";

const firecrawlPlugin: IntegrationPlugin = {
  type: "firecrawl",
  label: "Firecrawl",
  description: "Scrape, search, and crawl the web",

  icon: FirecrawlIcon,

  formFields: [
    {
      id: "firecrawlApiKey",
      label: "API Key",
      type: "password",
      placeholder: "fc-...",
      configKey: "firecrawlApiKey",
      envVar: "FIRECRAWL_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "firecrawl.dev",
        url: "https://firecrawl.dev/app/api-keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testFirecrawl } = await import("./test");
      return testFirecrawl;
    },
  },

  actions: [
    {
      slug: "scrape",
      label: "Scrape URL",
      description: "Scrape content from a URL",
      category: "Firecrawl",
      stepFunction: "firecrawlScrapeStep",
      stepImportPath: "scrape",
      outputFields: [
        { field: "markdown", description: "Scraped content as markdown" },
        { field: "metadata", description: "Page metadata object" },
      ],
      configFields: [
        {
          key: "url",
          label: "URL",
          type: "template-input",
          placeholder: "https://example.com or {{NodeName.url}}",
          example: "https://example.com",
          required: true,
        },
      ],
    },
    {
      slug: "search",
      label: "Search Web",
      description: "Search the web with Firecrawl",
      category: "Firecrawl",
      stepFunction: "firecrawlSearchStep",
      stepImportPath: "search",
      outputFields: [{ field: "data", description: "Array of search results" }],
      configFields: [
        {
          key: "query",
          label: "Search Query",
          type: "template-input",
          placeholder: "Search query or {{NodeName.query}}",
          example: "latest AI news",
          required: true,
        },
        {
          key: "limit",
          label: "Result Limit",
          type: "number",
          placeholder: "10",
          min: 1,
          example: "10",
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(firecrawlPlugin);

export default firecrawlPlugin;
