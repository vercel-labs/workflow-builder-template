import { MessageSquarePlus, Send } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { createChatCodegenTemplate } from "./codegen/create-chat";
import { sendMessageCodegenTemplate } from "./codegen/send-message";
import { V0Icon } from "./icon";
import { V0Settings } from "./settings";
import { CreateChatConfigFields } from "./steps/create-chat/config";
import { SendMessageConfigFields } from "./steps/send-message/config";

const v0Plugin: IntegrationPlugin = {
  type: "v0",
  label: "v0",
  description: "Generate UI components with AI",

  icon: {
    type: "svg",
    value: "V0Icon",
    svgComponent: V0Icon,
  },

  settingsComponent: V0Settings,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "v0_...",
      configKey: "apiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "v0.dev/chat/settings/keys",
        url: "https://v0.dev/chat/settings/keys",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apiKey) {
      creds.V0_API_KEY = String(config.apiKey);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testV0 } = await import("./test");
      return testV0;
    },
  },

  actions: [
    {
      id: "Create Chat",
      label: "Create Chat",
      description: "Create a new chat in v0",
      category: "v0",
      icon: MessageSquarePlus,
      stepFunction: "createChatStep",
      stepImportPath: "create-chat",
      configFields: CreateChatConfigFields,
      codegenTemplate: createChatCodegenTemplate,
    },
    {
      id: "Send Message",
      label: "Send Message",
      description: "Send a message to an existing v0 chat",
      category: "v0",
      icon: Send,
      stepFunction: "sendMessageStep",
      stepImportPath: "send-message",
      configFields: SendMessageConfigFields,
      codegenTemplate: sendMessageCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(v0Plugin);

export default v0Plugin;

