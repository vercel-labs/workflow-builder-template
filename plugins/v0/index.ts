import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { V0Icon } from "./icon";

const v0Plugin: IntegrationPlugin = {
  type: "v0",
  label: "v0",
  description: "Generate UI components with AI",

  icon: V0Icon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "v0_...",
      configKey: "apiKey",
      envVar: "V0_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "v0.dev/chat/settings/keys",
        url: "https://v0.dev/chat/settings/keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testV0 } = await import("./test");
      return testV0;
    },
  },

  dependencies: {},

  actions: [
    {
      slug: "create-chat",
      label: "Create Chat",
      description: "Create a new chat in v0",
      category: "v0",
      stepFunction: "createChatStep",
      stepImportPath: "create-chat",
      outputFields: [
        { field: "chatId", description: "v0 chat ID" },
        { field: "url", description: "v0 chat URL" },
        { field: "demoUrl", description: "Demo preview URL" },
      ],
      outputConfig: { type: "url", field: "demoUrl" },
      configFields: [
        {
          key: "message",
          label: "Message",
          type: "template-textarea",
          placeholder: "Create a landing page for a new product",
          rows: 4,
          example: "Create a dashboard with a line chart showing DAU over time",
          required: true,
        },
        {
          key: "system",
          label: "System Prompt (Optional)",
          type: "template-textarea",
          placeholder: "You are an expert coder",
          rows: 3,
        },
      ],
    },
    {
      slug: "send-message",
      label: "Send Message",
      description: "Send a message to an existing v0 chat",
      category: "v0",
      stepFunction: "sendMessageStep",
      stepImportPath: "send-message",
      outputFields: [
        { field: "chatId", description: "v0 chat ID" },
        { field: "demoUrl", description: "Demo preview URL" },
      ],
      outputConfig: { type: "url", field: "demoUrl" },
      configFields: [
        {
          key: "chatId",
          label: "Chat ID",
          type: "template-input",
          placeholder: "chat_123 or {{CreateChat.chatId}}",
          example: "{{CreateChat.chatId}}",
          required: true,
        },
        {
          key: "message",
          label: "Message",
          type: "template-textarea",
          placeholder: "Add dark mode",
          rows: 4,
          example: "Add dark mode support",
          required: true,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(v0Plugin);

export default v0Plugin;
