import { Globe } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { runActorCodegenTemplate } from "./codegen/run-actor";
import { scrapeSingleUrlCodegenTemplate } from "./codegen/scrape-single-url";
import { ApifyIcon } from "./icon";
import { ApifySettings } from "./settings";
import { testApify } from "./test";

const apifyPlugin: IntegrationPlugin = {
  type: "apify",
  label: "Apify",
  description: "Run web scraping and automation Actors",

  icon: ApifyIcon,

  settingsComponent: ApifySettings,

  formFields: [
    {
      id: "apifyApiKey",
      label: "API Token",
      type: "password",
      placeholder: "apify_api_...",
      configKey: "apifyApiKey",
      helpText: "Get your API token from ",
      helpLink: {
        text: "Apify Console",
        url: "https://console.apify.com/account/integrations",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apifyApiKey) {
      creds.APIFY_API_KEY = String(config.apifyApiKey);
    }
    return creds;
  },

  testConfig: {
    testFunction: testApify,
  },

  actions: [
    {
      slug: "run-actor",
      label: "Run Apify Actor",
      description: "Run an Apify Actor and get results",
      category: "Apify",
      icon: ApifyIcon,
      stepFunction: "apifyRunActorStep",
      stepImportPath: "run-actor/step",
      configFields: [
        {
          key: "actorId",
          label: "Actor (ID or name)",
          type: "template-input",
          placeholder: "apify/web-scraper or {{NodeName.actorId}}",
          example: "apify/web-scraper",
          required: true,
        },
        {
          key: "actorInput",
          label: "Actor Input (JSON)",
          type: "template-textarea",
          placeholder: '{"startUrls": [{"url": "https://example.com"}]}',
          rows: 6,
          example: '{"startUrls": [{"url": "https://example.com"}]}',
          required: true,
        },
      ],
      codegenTemplate: runActorCodegenTemplate,
    },
    {
      slug: "scrape-single-url",
      label: "Scrape Single URL",
      description: "Scrape a single URL and get markdown output",
      category: "Apify",
      icon: Globe,
      stepFunction: "scrapeSingleUrlStep",
      stepImportPath: "scrape-single-url/step",
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
          key: "crawlerType",
          label: "Crawler Type",
          type: "select",
          defaultValue: "playwright",
          options: [
            {
              value: "playwright:adaptive",
              label: "Adaptive switching between browser and raw HTTP",
            },
            {
              value: "playwright:firefox",
              label: "Headless browser (Firefox+Playwright)",
            },
            {
              value: "cheerio",
              label: "Raw HTTP client (Cheerio)",
            },
          ],
        },
      ],
      codegenTemplate: scrapeSingleUrlCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(apifyPlugin);

export default apifyPlugin;
