import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { DeepLIcon } from "./icon";

const deepLPlugin: IntegrationPlugin = {
  type: "deepl",
  label: "DeepL",
  description: "Translate text with DeepL",

  icon: DeepLIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
      configKey: "apiKey",
      envVar: "DEEPL_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "DeepL Account",
        url: "https://www.deepl.com/account/summary",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testDeepL } = await import("./test");
      return testDeepL;
    },
  },

  actions: [
    {
      slug: "translate-text",
      label: "Translate Text",
      description: "Translate text from one language to another",
      category: "DeepL",
      stepFunction: "translateTextStep",
      stepImportPath: "translate-text",
      outputFields: [
        { field: "translatedText", description: "The translated text" },
        { field: "detectedSourceLang", description: "Detected source language code" },
      ],
      configFields: [
        {
          key: "text",
          label: "Text to Translate",
          type: "template-textarea",
          placeholder: "Enter text or use {{NodeName.field}}",
          example: "Hello, how are you?",
          rows: 4,
          required: true,
        },
        {
          key: "targetLang",
          label: "Target Language",
          type: "select",
          options: [
            { value: "EN-US", label: "English (US)" },
            { value: "EN-GB", label: "English (UK)" },
            { value: "DE", label: "German" },
            { value: "FR", label: "French" },
            { value: "ES", label: "Spanish" },
            { value: "IT", label: "Italian" },
            { value: "PT-PT", label: "Portuguese (Portugal)" },
            { value: "PT-BR", label: "Portuguese (Brazil)" },
            { value: "NL", label: "Dutch" },
            { value: "PL", label: "Polish" },
            { value: "RU", label: "Russian" },
            { value: "JA", label: "Japanese" },
            { value: "ZH-HANS", label: "Chinese (Simplified)" },
            { value: "ZH-HANT", label: "Chinese (Traditional)" },
            { value: "KO", label: "Korean" },
          ],
          required: true,
        },
        {
          key: "sourceLang",
          label: "Source Language (optional)",
          type: "select",
          options: [
            { value: "auto", label: "Auto-detect" },
            { value: "EN", label: "English" },
            { value: "DE", label: "German" },
            { value: "FR", label: "French" },
            { value: "ES", label: "Spanish" },
            { value: "IT", label: "Italian" },
            { value: "PT", label: "Portuguese" },
            { value: "NL", label: "Dutch" },
            { value: "PL", label: "Polish" },
            { value: "RU", label: "Russian" },
            { value: "JA", label: "Japanese" },
            { value: "ZH", label: "Chinese" },
            { value: "KO", label: "Korean" },
          ],
          defaultValue: "auto",
        },
        {
          key: "formality",
          label: "Formality",
          type: "select",
          options: [
            { value: "default", label: "Default" },
            { value: "more", label: "More formal" },
            { value: "less", label: "Less formal" },
            { value: "prefer_more", label: "Prefer more formal" },
            { value: "prefer_less", label: "Prefer less formal" },
          ],
          defaultValue: "default",
        },
        {
          key: "modelType",
          label: "Model Type",
          type: "select",
          options: [
            { value: "default", label: "Default" },
            { value: "quality_optimized", label: "Better quality" },
            { value: "latency_optimized", label: "Faster translation" },
            { value: "prefer_quality_optimized", label: "Quality over speed" },
          ],
          defaultValue: "default",
        },
      ],
    },
  ],
};

registerIntegration(deepLPlugin);

export default deepLPlugin;
