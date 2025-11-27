import { Play } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { runActorCodegenTemplate } from "./codegen/run-actor";
import { ApifyIcon } from "./icon";
import { ApifySettings } from "./settings";
import { RunActorConfigFields } from "./steps/run-actor/config";
import { testApify } from "./test";

const apifyPlugin: IntegrationPlugin = {
  type: "apify",
  label: "Apify",
  description: "Run web scraping and automation Actors",

  icon: {
    type: "svg",
    value: "ApifyIcon",
    svgComponent: ApifyIcon,
  },

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
      id: "Run Actor",
      label: "Run Actor",
      description: "Run an Apify Actor and get results",
      category: "Apify",
      icon: Play,
      stepFunction: "apifyRunActorStep",
      stepImportPath: "run-actor",
      configFields: RunActorConfigFields,
      codegenTemplate: runActorCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(apifyPlugin);

export default apifyPlugin;
