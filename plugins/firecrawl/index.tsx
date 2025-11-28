import { Flame, Search } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { scrapeCodegenTemplate } from "./codegen/scrape";
import { searchCodegenTemplate } from "./codegen/search";
import { FirecrawlIcon } from "./icon";
import { FirecrawlSettings } from "./settings";
import { ScrapeConfigFields } from "./steps/scrape/config";
import { SearchConfigFields } from "./steps/search/config";

const firecrawlPlugin: IntegrationPlugin = {
  type: "firecrawl",
  label: "Firecrawl",
  description: "Scrape, search, and crawl the web",

  icon: {
    type: "svg",
    value: "FirecrawlIcon",
    svgComponent: FirecrawlIcon,
  },

  settingsComponent: FirecrawlSettings,

  formFields: [
    {
      id: "firecrawlApiKey",
      label: "API Key",
      type: "password",
      placeholder: "fc-...",
      configKey: "firecrawlApiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "firecrawl.dev",
        url: "https://firecrawl.dev/app/api-keys",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.firecrawlApiKey) {
      creds.FIRECRAWL_API_KEY = String(config.firecrawlApiKey);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testFirecrawl } = await import("./test");
      return testFirecrawl;
    },
  },

  actions: [
    {
      id: "Scrape",
      label: "Scrape URL",
      description: "Scrape content from a URL",
      category: "Firecrawl",
      icon: Flame,
      stepFunction: "firecrawlScrapeStep",
      stepImportPath: "scrape",
      configFields: ScrapeConfigFields,
      codegenTemplate: scrapeCodegenTemplate,
    },
    {
      id: "Search",
      label: "Search Web",
      description: "Search the web with Firecrawl",
      category: "Firecrawl",
      icon: Search,
      stepFunction: "firecrawlSearchStep",
      stepImportPath: "search",
      configFields: SearchConfigFields,
      codegenTemplate: searchCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(firecrawlPlugin);

export default firecrawlPlugin;
