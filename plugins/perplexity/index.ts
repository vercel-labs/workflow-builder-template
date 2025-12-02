import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { PerplexityIcon } from "./icon";

const perplexityPlugin: IntegrationPlugin = {
  type: "perplexity",
  label: "Perplexity",
  description: "AI-powered search and research with real-time web access",

  icon: PerplexityIcon,

  formFields: [
    {
      id: "perplexityApiKey",
      label: "API Key",
      type: "password",
      placeholder: "pplx-...",
      configKey: "apiKey",
      envVar: "PERPLEXITY_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "perplexity.ai/settings/api",
        url: "https://www.perplexity.ai/settings/api",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testPerplexity } = await import("./test");
      return testPerplexity;
    },
  },

  actions: [
    {
      slug: "search",
      label: "Search Web",
      description:
        "Search the web with AI-powered answers and citations from Perplexity",
      category: "Perplexity",
      stepFunction: "perplexitySearchStep",
      stepImportPath: "search",
      outputFields: [
        { field: "answer", description: "AI-generated answer to the query" },
        { field: "citations", description: "Array of source URLs" },
        { field: "model", description: "Model used for the response" },
      ],
      configFields: [
        {
          key: "query",
          label: "Search Query",
          type: "template-input",
          placeholder: "Enter your search query or use {{NodeName.field}}",
          example: "What are the latest developments in AI?",
          required: true,
        },
        {
          key: "searchFocus",
          label: "Search Focus",
          type: "select",
          defaultValue: "internet",
          options: [
            { value: "internet", label: "General Web" },
            { value: "academic", label: "Academic Sources" },
            { value: "news", label: "News Articles" },
            { value: "youtube", label: "YouTube" },
            { value: "reddit", label: "Reddit" },
          ],
        },
      ],
    },
    {
      slug: "ask",
      label: "Ask Question",
      description:
        "Ask a question and get an AI-powered response with web sources",
      category: "Perplexity",
      stepFunction: "perplexityAskStep",
      stepImportPath: "ask",
      outputFields: [
        { field: "answer", description: "AI-generated answer" },
        { field: "citations", description: "Array of source URLs" },
        { field: "model", description: "Model used for the response" },
      ],
      configFields: [
        {
          key: "question",
          label: "Question",
          type: "template-textarea",
          placeholder: "Enter your question or use {{NodeName.field}}",
          example: "Explain quantum computing in simple terms",
          rows: 3,
          required: true,
        },
        {
          key: "systemPrompt",
          label: "System Prompt",
          type: "template-textarea",
          placeholder: "Optional: customize how Perplexity responds",
          rows: 2,
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          defaultValue: "sonar",
          options: [
            { value: "sonar", label: "Sonar (Fast)" },
            { value: "sonar-pro", label: "Sonar Pro (Advanced)" },
            { value: "sonar-reasoning", label: "Sonar Reasoning (Complex)" },
          ],
        },
      ],
    },
    {
      slug: "research",
      label: "Research Topic",
      description:
        "Conduct deep research on a topic with comprehensive analysis and citations",
      category: "Perplexity",
      stepFunction: "perplexityResearchStep",
      stepImportPath: "research",
      outputFields: [
        { field: "report", description: "Comprehensive research report" },
        { field: "citations", description: "Array of source URLs" },
        { field: "model", description: "Model used for the response" },
      ],
      configFields: [
        {
          key: "topic",
          label: "Research Topic",
          type: "template-textarea",
          placeholder:
            "Enter the topic to research or use {{NodeName.field}}",
          example: "The impact of artificial intelligence on healthcare",
          rows: 3,
          required: true,
        },
        {
          key: "depth",
          label: "Research Depth",
          type: "select",
          defaultValue: "detailed",
          options: [
            { value: "brief", label: "Brief Overview" },
            { value: "detailed", label: "Detailed Analysis" },
            { value: "comprehensive", label: "Comprehensive Report" },
          ],
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(perplexityPlugin);

export default perplexityPlugin;
