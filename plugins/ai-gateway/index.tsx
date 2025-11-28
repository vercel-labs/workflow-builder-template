import { Image, Sparkles } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { generateImageCodegenTemplate } from "./codegen/generate-image";
import { generateTextCodegenTemplate } from "./codegen/generate-text";
import { AiGatewaySettings } from "./settings";
import { GenerateImageConfigFields } from "./steps/generate-image/config";
import { GenerateTextConfigFields } from "./steps/generate-text/config";

const aiGatewayPlugin: IntegrationPlugin = {
  type: "ai-gateway",
  label: "AI Gateway",
  description: "Generate text and images using AI models",

  icon: {
    type: "lucide",
    value: "Sparkles",
  },

  settingsComponent: AiGatewaySettings,

  formFields: [
    {
      id: "openaiApiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your AI Gateway API key",
      configKey: "apiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "vercel.com/ai-gateway",
        url: "https://vercel.com/docs/ai-gateway/getting-started",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apiKey) {
      creds.AI_GATEWAY_API_KEY = String(config.apiKey);
    }
    // Legacy support for openaiApiKey
    if (config.openaiApiKey) {
      creds.AI_GATEWAY_API_KEY = String(config.openaiApiKey);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testAiGateway } = await import("./test");
      return testAiGateway;
    },
  },

  actions: [
    {
      id: "Generate Text",
      label: "Generate Text",
      description: "Generate text using AI models",
      category: "AI Gateway",
      icon: Sparkles,
      stepFunction: "generateTextStep",
      stepImportPath: "generate-text",
      configFields: GenerateTextConfigFields,
      codegenTemplate: generateTextCodegenTemplate,
    },
    {
      id: "Generate Image",
      label: "Generate Image",
      description: "Generate images using AI models",
      category: "AI Gateway",
      icon: Image,
      stepFunction: "generateImageStep",
      stepImportPath: "generate-image",
      configFields: GenerateImageConfigFields,
      codegenTemplate: generateImageCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(aiGatewayPlugin);

export default aiGatewayPlugin;
