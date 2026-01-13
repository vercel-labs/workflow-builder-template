import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { InstantlyIcon } from "./icon";

const instantlyPlugin: IntegrationPlugin = {
  type: "instantly",
  label: "Instantly",
  description: "Cold email outreach and lead management platform",

  icon: InstantlyIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your Instantly API key",
      configKey: "apiKey",
      envVar: "INSTANTLY_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "app.instantly.ai/app/settings/integrations",
        url: "https://app.instantly.ai/app/settings/integrations",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testInstantly } = await import("./test");
      return testInstantly;
    },
  },

  actions: [
    // Lead Operations
    {
      slug: "create-lead",
      label: "Create Lead",
      description: "Create a new lead in a campaign",
      category: "Instantly",
      stepFunction: "createLeadStep",
      stepImportPath: "create-lead",
      outputFields: [
        { field: "id", description: "Lead ID" },
        { field: "email", description: "Lead email" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID or {{NodeName.campaignId}}",
          required: true,
        },
        {
          key: "email",
          label: "Email",
          type: "template-input",
          placeholder: "lead@example.com or {{NodeName.email}}",
          required: true,
        },
        {
          key: "firstName",
          label: "First Name",
          type: "template-input",
          placeholder: "John or {{NodeName.firstName}}",
        },
        {
          key: "lastName",
          label: "Last Name",
          type: "template-input",
          placeholder: "Doe or {{NodeName.lastName}}",
        },
        {
          key: "companyName",
          label: "Company Name",
          type: "template-input",
          placeholder: "Acme Inc or {{NodeName.companyName}}",
        },
        {
          type: "group",
          label: "Additional Fields",
          fields: [
            {
              key: "personalization",
              label: "Personalization",
              type: "template-textarea",
              placeholder: "Custom personalization message",
              rows: 3,
            },
            {
              key: "phone",
              label: "Phone",
              type: "template-input",
              placeholder: "+1234567890",
            },
            {
              key: "website",
              label: "Website",
              type: "template-input",
              placeholder: "https://example.com",
            },
            {
              key: "customVariables",
              label: "Custom Variables (JSON)",
              type: "template-textarea",
              placeholder: '{"key": "value"}',
              rows: 3,
            },
          ],
        },
      ],
    },
    {
      slug: "get-lead",
      label: "Get Lead",
      description: "Get a lead by ID",
      category: "Instantly",
      stepFunction: "getLeadStep",
      stepImportPath: "get-lead",
      outputFields: [
        { field: "id", description: "Lead ID" },
        { field: "email", description: "Lead email" },
        { field: "firstName", description: "First name" },
        { field: "lastName", description: "Last name" },
        { field: "status", description: "Lead status" },
      ],
      configFields: [
        {
          key: "leadId",
          label: "Lead ID",
          type: "template-input",
          placeholder: "Lead UUID or {{NodeName.leadId}}",
          required: true,
        },
      ],
    },
    {
      slug: "list-leads",
      label: "List Leads",
      description: "List leads with optional filters",
      category: "Instantly",
      stepFunction: "listLeadsStep",
      stepImportPath: "list-leads",
      outputFields: [
        { field: "leads", description: "Array of leads" },
        { field: "total", description: "Total count" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID (optional)",
        },
        {
          key: "email",
          label: "Email Filter",
          type: "template-input",
          placeholder: "Filter by email",
        },
        {
          key: "limit",
          label: "Limit",
          type: "number",
          defaultValue: "100",
          min: 1,
        },
      ],
    },
    {
      slug: "update-lead",
      label: "Update Lead",
      description: "Update an existing lead",
      category: "Instantly",
      stepFunction: "updateLeadStep",
      stepImportPath: "update-lead",
      outputFields: [
        { field: "id", description: "Lead ID" },
        { field: "email", description: "Lead email" },
      ],
      configFields: [
        {
          key: "leadId",
          label: "Lead ID",
          type: "template-input",
          placeholder: "Lead UUID or {{NodeName.leadId}}",
          required: true,
        },
        {
          key: "firstName",
          label: "First Name",
          type: "template-input",
          placeholder: "John or {{NodeName.firstName}}",
        },
        {
          key: "lastName",
          label: "Last Name",
          type: "template-input",
          placeholder: "Doe or {{NodeName.lastName}}",
        },
        {
          key: "companyName",
          label: "Company Name",
          type: "template-input",
          placeholder: "Acme Inc",
        },
        {
          key: "customVariables",
          label: "Custom Variables (JSON)",
          type: "template-textarea",
          placeholder: '{"key": "value"}',
          rows: 3,
        },
      ],
    },
    {
      slug: "delete-lead",
      label: "Delete Lead",
      description: "Delete a lead by ID",
      category: "Instantly",
      stepFunction: "deleteLeadStep",
      stepImportPath: "delete-lead",
      outputFields: [{ field: "deleted", description: "Deletion status" }],
      configFields: [
        {
          key: "leadId",
          label: "Lead ID",
          type: "template-input",
          placeholder: "Lead UUID or {{NodeName.leadId}}",
          required: true,
        },
      ],
    },
    {
      slug: "update-lead-status",
      label: "Update Lead Interest Status",
      description: "Update the interest status of a lead",
      category: "Instantly",
      stepFunction: "updateLeadStatusStep",
      stepImportPath: "update-lead-status",
      outputFields: [
        { field: "id", description: "Lead ID" },
        { field: "status", description: "New status" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
        {
          key: "email",
          label: "Lead Email",
          type: "template-input",
          placeholder: "lead@example.com",
          required: true,
        },
        {
          key: "status",
          label: "Interest Status",
          type: "select",
          options: [
            { value: "interested", label: "Interested" },
            { value: "not_interested", label: "Not Interested" },
            { value: "meeting_booked", label: "Meeting Booked" },
            { value: "meeting_completed", label: "Meeting Completed" },
            { value: "closed", label: "Closed" },
            { value: "out_of_office", label: "Out of Office" },
            { value: "wrong_person", label: "Wrong Person" },
          ],
          required: true,
        },
      ],
    },
    {
      slug: "add-lead-to-campaign",
      label: "Add Lead to Campaign",
      description: "Add an existing lead to a campaign",
      category: "Instantly",
      stepFunction: "addLeadToCampaignStep",
      stepImportPath: "add-lead-to-campaign",
      outputFields: [
        { field: "id", description: "Lead ID" },
        { field: "campaignId", description: "Campaign ID" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
        {
          key: "email",
          label: "Lead Email",
          type: "template-input",
          placeholder: "lead@example.com",
          required: true,
        },
      ],
    },
    // Campaign Operations
    {
      slug: "create-campaign",
      label: "Create Campaign",
      description: "Create a new email campaign",
      category: "Instantly",
      stepFunction: "createCampaignStep",
      stepImportPath: "create-campaign",
      outputFields: [
        { field: "id", description: "Campaign ID" },
        { field: "name", description: "Campaign name" },
      ],
      configFields: [
        {
          key: "name",
          label: "Campaign Name",
          type: "template-input",
          placeholder: "My Campaign or {{NodeName.name}}",
          required: true,
        },
      ],
    },
    {
      slug: "get-campaign",
      label: "Get Campaign",
      description: "Get a campaign by ID",
      category: "Instantly",
      stepFunction: "getCampaignStep",
      stepImportPath: "get-campaign",
      outputFields: [
        { field: "id", description: "Campaign ID" },
        { field: "name", description: "Campaign name" },
        { field: "status", description: "Campaign status" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID or {{NodeName.campaignId}}",
          required: true,
        },
      ],
    },
    {
      slug: "list-campaigns",
      label: "List Campaigns",
      description: "List all campaigns",
      category: "Instantly",
      stepFunction: "listCampaignsStep",
      stepImportPath: "list-campaigns",
      outputFields: [
        { field: "campaigns", description: "Array of campaigns" },
        { field: "total", description: "Total count" },
      ],
      configFields: [
        {
          key: "status",
          label: "Status Filter",
          type: "select",
          options: [
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
            { value: "draft", label: "Draft" },
          ],
        },
        {
          key: "limit",
          label: "Limit",
          type: "number",
          defaultValue: "100",
          min: 1,
        },
      ],
    },
    {
      slug: "update-campaign",
      label: "Update Campaign",
      description: "Update an existing campaign",
      category: "Instantly",
      stepFunction: "updateCampaignStep",
      stepImportPath: "update-campaign",
      outputFields: [
        { field: "id", description: "Campaign ID" },
        { field: "name", description: "Campaign name" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
        {
          key: "name",
          label: "Campaign Name",
          type: "template-input",
          placeholder: "New campaign name",
        },
      ],
    },
    {
      slug: "delete-campaign",
      label: "Delete Campaign",
      description: "Delete a campaign by ID",
      category: "Instantly",
      stepFunction: "deleteCampaignStep",
      stepImportPath: "delete-campaign",
      outputFields: [{ field: "deleted", description: "Deletion status" }],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
      ],
    },
    {
      slug: "activate-campaign",
      label: "Activate Campaign",
      description: "Launch/activate a campaign",
      category: "Instantly",
      stepFunction: "activateCampaignStep",
      stepImportPath: "activate-campaign",
      outputFields: [
        { field: "id", description: "Campaign ID" },
        { field: "status", description: "Campaign status" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
      ],
    },
    {
      slug: "pause-campaign",
      label: "Pause Campaign",
      description: "Pause a running campaign",
      category: "Instantly",
      stepFunction: "pauseCampaignStep",
      stepImportPath: "pause-campaign",
      outputFields: [
        { field: "id", description: "Campaign ID" },
        { field: "status", description: "Campaign status" },
      ],
      configFields: [
        {
          key: "campaignId",
          label: "Campaign ID",
          type: "template-input",
          placeholder: "Campaign UUID",
          required: true,
        },
      ],
    },
    // Account Operations
    {
      slug: "list-accounts",
      label: "List Accounts",
      description: "List all email accounts",
      category: "Instantly",
      stepFunction: "listAccountsStep",
      stepImportPath: "list-accounts",
      outputFields: [
        { field: "accounts", description: "Array of accounts" },
        { field: "total", description: "Total count" },
      ],
      configFields: [
        {
          key: "limit",
          label: "Limit",
          type: "number",
          defaultValue: "100",
          min: 1,
        },
      ],
    },
    {
      slug: "get-account",
      label: "Get Account",
      description: "Get an email account by email address",
      category: "Instantly",
      stepFunction: "getAccountStep",
      stepImportPath: "get-account",
      outputFields: [
        { field: "email", description: "Account email" },
        { field: "status", description: "Account status" },
        { field: "warmupEnabled", description: "Warmup enabled status" },
      ],
      configFields: [
        {
          key: "email",
          label: "Account Email",
          type: "template-input",
          placeholder: "account@example.com",
          required: true,
        },
      ],
    },
    {
      slug: "pause-account",
      label: "Pause Account",
      description: "Pause an email account",
      category: "Instantly",
      stepFunction: "pauseAccountStep",
      stepImportPath: "pause-account",
      outputFields: [
        { field: "email", description: "Account email" },
        { field: "status", description: "Account status" },
      ],
      configFields: [
        {
          key: "email",
          label: "Account Email",
          type: "template-input",
          placeholder: "account@example.com",
          required: true,
        },
      ],
    },
    {
      slug: "resume-account",
      label: "Resume Account",
      description: "Resume a paused email account",
      category: "Instantly",
      stepFunction: "resumeAccountStep",
      stepImportPath: "resume-account",
      outputFields: [
        { field: "email", description: "Account email" },
        { field: "status", description: "Account status" },
      ],
      configFields: [
        {
          key: "email",
          label: "Account Email",
          type: "template-input",
          placeholder: "account@example.com",
          required: true,
        },
      ],
    },
    {
      slug: "enable-warmup",
      label: "Enable Warmup",
      description: "Enable warmup for email accounts",
      category: "Instantly",
      stepFunction: "enableWarmupStep",
      stepImportPath: "enable-warmup",
      outputFields: [{ field: "enabled", description: "Warmup enabled status" }],
      configFields: [
        {
          key: "emails",
          label: "Account Emails",
          type: "template-textarea",
          placeholder: "account1@example.com\naccount2@example.com",
          rows: 4,
          required: true,
        },
      ],
    },
    {
      slug: "disable-warmup",
      label: "Disable Warmup",
      description: "Disable warmup for email accounts",
      category: "Instantly",
      stepFunction: "disableWarmupStep",
      stepImportPath: "disable-warmup",
      outputFields: [{ field: "disabled", description: "Warmup disabled status" }],
      configFields: [
        {
          key: "emails",
          label: "Account Emails",
          type: "template-textarea",
          placeholder: "account1@example.com\naccount2@example.com",
          rows: 4,
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(instantlyPlugin);

export default instantlyPlugin;

