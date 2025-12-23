import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { AiGatewayIcon } from "./icon";

const aiGatewayPlugin: IntegrationPlugin = {
  type: "ai-gateway",
  label: "AI Gateway",
  description: "Generate text, images, and embeddings using AI models",

  icon: AiGatewayIcon,

  formFields: [
    {
      id: "openaiApiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your AI Gateway API key",
      configKey: "apiKey",
      envVar: "AI_GATEWAY_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "vercel.com/ai-gateway",
        url: "https://vercel.com/docs/ai-gateway/getting-started",
      },
    },
  ],

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

  actions: [
    {
      slug: "generate-text",
      label: "Generate Text",
      description: "Generate text using AI models",
      category: "AI Gateway",
      stepFunction: "generateTextStep",
      stepImportPath: "generate-text",
      configFields: [
        {
          key: "aiFormat",
          label: "Output Format",
          type: "select",
          defaultValue: "text",
          options: [
            { value: "text", label: "Text" },
            { value: "object", label: "Object" },
          ],
        },
        {
          key: "aiModel",
          label: "Model",
          type: "select",
          defaultValue: "meta/llama-4-scout",
          options: [
            // Current models
            { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
            { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
            { value: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5" },
            { value: "meta/llama-4-scout", label: "Llama 4 Scout" },
            { value: "meta/llama-4-maverick", label: "Llama 4 Maverick" },
            { value: "openai/gpt-5.2", label: "GPT-5.2" },
            { value: "openai/gpt-5.2-pro", label: "GPT-5.2 Pro" },
            {
              value: "google/gemini-3-pro-preview",
              label: "Gemini 3 Pro Preview",
            },
            { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
            { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            // Legacy models (kept for backwards compatibility)
            { value: "anthropic/claude-sonnet-4.0", label: "Claude Sonnet 4.0" },
            {
              value: "anthropic/claude-3.5-sonnet-20241022",
              label: "Claude 3.5 Sonnet",
            },
            { value: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
            { value: "openai/gpt-4o", label: "GPT-4o" },
            { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
            { value: "openai/o1", label: "o1" },
            { value: "openai/o1-mini", label: "o1 Mini" },
            { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
            { value: "openai/gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
            { value: "google/gemini-4.0-flash", label: "Gemini 4.0 Flash" },
            { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
            {
              value: "google/gemini-2.0-flash-lite",
              label: "Gemini 2.0 Flash Lite",
            },
            { value: "meta/llama-4-instruct", label: "Llama 4 Instruct" },
          ],
        },
        {
          key: "aiPrompt",
          label: "Prompt",
          type: "template-textarea",
          placeholder:
            "Enter your prompt here. Use {{NodeName.field}} to reference previous outputs.",
          rows: 4,
          example: "Summarize the following text: {{Scrape.markdown}}",
          required: true,
        },
        {
          key: "aiSchema",
          label: "Schema",
          type: "schema-builder",
          showWhen: { field: "aiFormat", equals: "object" },
        },
      ],
    },
    {
      slug: "generate-image",
      label: "Generate Image",
      description: "Generate images using AI models",
      category: "AI Gateway",
      stepFunction: "generateImageStep",
      stepImportPath: "generate-image",
      outputFields: [{ field: "base64", description: "Base64-encoded image data" }],
      outputConfig: { type: "image", field: "base64" },
      configFields: [
        {
          key: "imageModel",
          label: "Model",
          type: "select",
          defaultValue: "google/imagen-4.0-generate-001",
          options: [
            {
              value: "google/imagen-4.0-generate-001",
              label: "Imagen 4",
            },
            {
              value: "google/imagen-4.0-fast-generate-001",
              label: "Imagen 4 Fast",
            },
            {
              value: "google/imagen-4.0-ultra-generate-001",
              label: "Imagen 4 Ultra",
            },
            {
              value: "bfl/flux-kontext-pro",
              label: "FLUX.1 Kontext Pro",
            },
            {
              value: "bfl/flux-kontext-max",
              label: "FLUX.1 Kontext Max",
            },
          ],
        },
        {
          key: "imagePrompt",
          label: "Prompt",
          type: "template-textarea",
          placeholder:
            "Describe the image you want to generate. Use {{NodeName.field}} to reference previous outputs.",
          rows: 4,
          example: "A serene mountain landscape at sunset",
          required: true,
        },
      ],
    },
    {
      slug: "generate-embeddings",
      label: "Generate Embeddings",
      description: "Generate text embeddings using AI models",
      category: "AI Gateway",
      stepFunction: "generateEmbeddingsStep",
      stepImportPath: "generate-embeddings",
      outputFields: [
        { field: "embedding", description: "Single embedding vector" },
        { field: "embeddings", description: "Batch embedding vectors" },
      ],
      configFields: [
        {
          key: "embeddingMode",
          label: "Embedding Mode",
          type: "select",
          defaultValue: "single",
          options: [
            { value: "single", label: "Single Value" },
            { value: "batch", label: "Batch Values" },
          ],
          required: true,
        },
        {
          key: "embeddingModel",
          label: "Model",
          type: "select",
          defaultValue: "openai/text-embedding-3-small",
          options: [
						{ value: "amazon/titan-embed-text-v2", label: "Amazon Titan Embed Text V2"},
						{ value: "cohere/embed-v4.0", label: "Cohere Embed V4.0"},
						{ value: "google/gemini-embedding-001", label: "Gemini Embedding 001"},
						{ value: "google/text-embedding-005", label: "Google Text Embedding 005" },
						{ value: "google/text-multilingual-embedding-002", label: "Google Text Multilingual Embedding 002" },
						{ value: "mistral/codestral-embed", label: "Mistral Codestral Embed" },
						{ value: "mistral/mistral-embed", label: "Mistral Embed" },
						{ value: "openai/text-embedding-3-large", label: "OpenAI Text Embedding 3 Large" },
						{ value: "openai/text-embedding-3-small", label: "OpenAI Text Embedding 3 Small" },
						{ value: "openai/text-embedding-ada-002", label: "OpenAI Text Embedding Ada 002" },
						{ value: "voyage/voyage-3-large", label: "Voyage 3 Large" },
						{ value: "voyage/voyage-3.5", label: "Voyage 3.5" },
						{ value: "voyage/voyage-3.5-lite", label: "Voyage 3.5 Lite" },
						{ value: "voyage/voyage-code-3", label: "Voyage Code 3" },
          ],
          required: true,
        },
        {
          key: "embeddingValue",
          label: "Text to Embed",
          type: "template-input",
          placeholder: "Enter text to embed. Use {{NodeName.field}} to reference previous outputs.",
          example: "sunny day at the beach",
          showWhen: { field: "embeddingMode", equals: "single" },
          required: true,
        },
        {
          key: "embeddingValues",
          label: "Texts to Embed",
          type: "template-textarea",
          placeholder:
						"Enter one text per line for batch embedding:\n- First text\n- Second text\nUse {{NodeName.field}} to reference previous outputs.",
          example:
            "sunny day at the beach\nrainy afternoon in the city\nsnowy night in the mountains",
          rows: 6,
          showWhen: { field: "embeddingMode", equals: "batch" },
          required: true,
        }
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(aiGatewayPlugin);

export default aiGatewayPlugin;
