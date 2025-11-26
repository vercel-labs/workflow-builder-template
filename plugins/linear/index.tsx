import { Ticket } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { createTicketCodegenTemplate } from "./codegen/create-ticket";
import { LinearSettings } from "./settings";
import { CreateTicketConfigFields } from "./steps/create-ticket/config";
import { testLinear } from "./test";

const linearPlugin: IntegrationPlugin = {
  type: "linear",
  label: "Linear",
  description: "Create and manage issues in Linear",

  icon: {
    type: "image",
    value: "/integrations/linear.svg",
  },

  settingsComponent: LinearSettings,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "lin_api_...",
      configKey: "apiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "linear.app",
        url: "https://linear.app/settings/account/security/api-keys/new",
      },
    },
    {
      id: "teamId",
      label: "Team ID (Optional)",
      type: "text",
      placeholder: "Will use first team if not specified",
      configKey: "teamId",
      helpText: "The team ID to create issues in. Leave blank to use your first team.",
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.apiKey) {
      creds.LINEAR_API_KEY = String(config.apiKey);
    }
    if (config.teamId) {
      creds.LINEAR_TEAM_ID = String(config.teamId);
    }
    return creds;
  },

  testConfig: {
    testFunction: testLinear,
  },

  actions: [
    {
      id: "Create Ticket",
      label: "Create Ticket",
      description: "Create an issue in Linear",
      category: "Linear",
      icon: Ticket,
      stepFunction: "createTicketStep",
      stepImportPath: "create-ticket",
      configFields: CreateTicketConfigFields,
      codegenTemplate: createTicketCodegenTemplate,
    },
    // TODO: Add Find Issues action
    {
      id: "Find Issues",
      label: "Find Issues",
      description: "Search for issues in Linear",
      category: "Linear",
      icon: Ticket,
      stepFunction: "createTicketStep", // TODO: Implement separate findIssuesStep
      stepImportPath: "create-ticket",
      configFields: CreateTicketConfigFields,
      codegenTemplate: createTicketCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(linearPlugin);

export default linearPlugin;

