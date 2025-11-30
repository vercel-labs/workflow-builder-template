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

  dependencies: {
    ai: "^5.0.86",
    openai: "^6.8.0",
    "@google/genai": "^1.28.0",
    zod: "^4.1.12",
  },

  envVars: [
    { name: "AI_GATEWAY_API_KEY", description: "AI Gateway API key" },
    { name: "OPENAI_API_KEY", description: "OpenAI API key (alternative)" },
    { name: "GOOGLE_AI_API_KEY", description: "Google AI API key (for Gemini)" },
  ],

  actions: [
    {
      slug: "generate-text",
      label: "Generate Text",
      description: "Generate text using AI models",
      category: "AI Gateway",
      icon: Sparkles,
      stepFunction: "generateTextStep",
      stepImportPath: "generate-text",
      configFields: GenerateTextConfigFields,
      codegenTemplate: generateTextCodegenTemplate,
      aiPrompt: `{"actionType": "ai-gateway/generate-text", "aiModel": "meta/llama-4-scout", "aiFormat": "text", "aiPrompt": "Your prompt here"}`,
    },
    {
      slug: "generate-image",
      label: "Generate Image",
      description: "Generate images using AI models",
      category: "AI Gateway",
      icon: Image,
      stepFunction: "generateImageStep",
      stepImportPath: "generate-image",
      configFields: GenerateImageConfigFields,
      codegenTemplate: generateImageCodegenTemplate,
      aiPrompt: `{"actionType": "ai-gateway/generate-image", "imageModel": "google/imagen-4.0-generate", "imagePrompt": "Image description"}`,
    },
  ],
};

// Auto-register on import
registerIntegration(aiGatewayPlugin);

export default aiGatewayPlugin;
