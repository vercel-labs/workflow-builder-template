import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { OlostepIcon } from "./icon";

const olostepPlugin: IntegrationPlugin = {
  type: "olostep",
  label: "Olostep",
  description: "Web Data API for AI - Search, extract, and structure web data",

  icon: OlostepIcon,

  formFields: [
    {
      id: "olostepApiKey",
      label: "API Key",
      type: "password",
      placeholder: "ols_...",
      configKey: "olostepApiKey",
      envVar: "OLOSTEP_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "olostep.com",
        url: "https://olostep.com/dashboard",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testOlostep } = await import("./test");
      return testOlostep;
    },
  },

  actions: [
    {
      slug: "scrape",
      label: "Scrape URL",
      description: "Extract content from any URL with full JavaScript rendering",
      category: "Olostep",
      stepFunction: "olostepScrapeStep",
      stepImportPath: "scrape",
      outputFields: [
        { field: "markdown", description: "Scraped content as markdown" },
        { field: "html", description: "Raw HTML content" },
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
        {
          key: "waitForSelector",
          label: "Wait for Selector",
          type: "text",
          placeholder: "CSS selector to wait for (optional)",
          example: ".main-content",
        },
      ],
    },
    {
      slug: "search",
      label: "Search Web",
      description: "Search the web using Google Search via Olostep",
      category: "Olostep",
      stepFunction: "olostepSearchStep",
      stepImportPath: "search",
      outputFields: [
        { field: "results", description: "Array of search results" },
        { field: "totalResults", description: "Total number of results" },
      ],
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
        {
          key: "country",
          label: "Country",
          type: "text",
          placeholder: "Country code (e.g., us, uk)",
          example: "us",
        },
      ],
    },
    {
      slug: "map",
      label: "Map Website",
      description: "Discover all URLs from a website (sitemap discovery)",
      category: "Olostep",
      stepFunction: "olostepMapStep",
      stepImportPath: "map",
      outputFields: [
        { field: "urls", description: "Array of discovered URLs" },
        { field: "count", description: "Number of URLs found" },
      ],
      configFields: [
        {
          key: "url",
          label: "Website URL",
          type: "template-input",
          placeholder: "https://example.com or {{NodeName.url}}",
          example: "https://example.com",
          required: true,
        },
        {
          key: "limit",
          label: "Max URLs",
          type: "number",
          placeholder: "100",
          min: 1,
          example: "100",
        },
      ],
    },
    {
      slug: "answer",
      label: "AI Answer",
      description: "Get AI-powered answers from web content",
      category: "Olostep",
      stepFunction: "olostepAnswerStep",
      stepImportPath: "answer",
      outputFields: [
        { field: "answer", description: "AI-generated answer" },
        { field: "sources", description: "Array of source URLs used" },
      ],
      configFields: [
        {
          key: "question",
          label: "Question",
          type: "template-input",
          placeholder: "What is the latest news about...?",
          example: "What are the key features of this product?",
          required: true,
        },
        {
          key: "searchQuery",
          label: "Search Query (optional)",
          type: "template-input",
          placeholder: "Search the web first for context",
          example: "product features comparison 2024",
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(olostepPlugin);

export default olostepPlugin;
