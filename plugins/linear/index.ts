import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { LinearIcon } from "./icon";

const linearPlugin: IntegrationPlugin = {
  type: "linear",
  label: "Linear",
  description: "Create and manage issues in Linear",

  icon: LinearIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "lin_api_...",
      configKey: "apiKey",
      envVar: "LINEAR_API_KEY",
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
      envVar: "LINEAR_TEAM_ID",
      helpText:
        "The team ID to create issues in. Leave blank to use your first team.",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testLinear } = await import("./test");
      return testLinear;
    },
  },

  actions: [
    {
      slug: "create-ticket",
      label: "Create Ticket",
      description: "Create an issue in Linear",
      category: "Linear",
      stepFunction: "createTicketStep",
      stepImportPath: "create-ticket",
      outputFields: [
        { field: "id", description: "Ticket ID" },
        { field: "url", description: "Ticket URL" },
        { field: "title", description: "Ticket title" },
      ],
      configFields: [
        {
          key: "ticketTitle",
          label: "Ticket Title",
          type: "template-input",
          placeholder: "Bug report or {{NodeName.title}}",
          example: "Bug: Login button not working",
          required: true,
        },
        {
          key: "ticketDescription",
          label: "Description",
          type: "template-textarea",
          placeholder:
            "Description. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "Users are unable to click the login button on mobile.",
        },
        {
          key: "ticketPriority",
          label: "Priority",
          type: "select",
          defaultValue: "2",
          options: [
            { value: "0", label: "No Priority" },
            { value: "1", label: "Urgent" },
            { value: "2", label: "High" },
            { value: "3", label: "Normal" },
            { value: "4", label: "Low" },
          ],
        },
      ],
    },
    {
      slug: "find-issues",
      label: "Find Issues",
      description: "Search for issues in Linear",
      category: "Linear",
      stepFunction: "findIssuesStep",
      stepImportPath: "find-issues",
      outputFields: [
        { field: "issues", description: "Array of issues found" },
        { field: "count", description: "Number of issues" },
      ],
      configFields: [
        {
          key: "linearAssigneeId",
          label: "Assignee (User ID)",
          type: "template-input",
          placeholder: "user-id-123 or {{NodeName.userId}}",
        },
        {
          key: "linearTeamId",
          label: "Team ID (optional)",
          type: "template-input",
          placeholder: "team-id-456 or {{NodeName.teamId}}",
        },
        {
          key: "linearStatus",
          label: "Status (optional)",
          type: "select",
          defaultValue: "any",
          placeholder: "Any status",
          options: [
            { value: "any", label: "Any" },
            { value: "backlog", label: "Backlog" },
            { value: "todo", label: "Todo" },
            { value: "in_progress", label: "In Progress" },
            { value: "done", label: "Done" },
            { value: "canceled", label: "Canceled" },
          ],
        },
        {
          key: "linearLabel",
          label: "Label (optional)",
          type: "template-input",
          placeholder: "bug, feature, etc. or {{NodeName.label}}",
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(linearPlugin);

export default linearPlugin;
