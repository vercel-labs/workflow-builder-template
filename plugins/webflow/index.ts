import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { WebflowIcon } from "./icon";

const webflowPlugin: IntegrationPlugin = {
  type: "webflow",
  label: "Webflow",
  description: "Publish and manage Webflow sites",

  icon: WebflowIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Token",
      type: "password",
      placeholder: "your-api-token",
      configKey: "apiKey",
      envVar: "WEBFLOW_API_KEY",
      helpText: "Generate an API token from ",
      helpLink: {
        text: "Webflow Dashboard",
        url: "https://webflow.com/dashboard",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testWebflow } = await import("./test");
      return testWebflow;
    },
  },

  actions: [
    {
      slug: "list-sites",
      label: "List Sites",
      description: "Get all sites accessible with the API token",
      category: "Webflow",
      stepFunction: "listSitesStep",
      stepImportPath: "list-sites",
      outputFields: [
        { field: "sites", description: "Array of site objects" },
        { field: "count", description: "Number of sites returned" },
      ],
      configFields: [],
    },
    {
      slug: "get-site",
      label: "Get Site",
      description: "Get details of a specific Webflow site",
      category: "Webflow",
      stepFunction: "getSiteStep",
      stepImportPath: "get-site",
      outputFields: [
        { field: "id", description: "Site ID" },
        { field: "displayName", description: "Display name of the site" },
        { field: "shortName", description: "Short name (subdomain)" },
        { field: "previewUrl", description: "Preview URL" },
        { field: "lastPublished", description: "Last published timestamp" },
        { field: "customDomains", description: "Array of custom domains" },
      ],
      configFields: [
        {
          key: "siteId",
          label: "Site ID",
          type: "template-input",
          placeholder: "site-id or {{NodeName.id}}",
          example: "580e63e98c9a982ac9b8b741",
          required: true,
        },
      ],
    },
    {
      slug: "publish-site",
      label: "Publish Site",
      description: "Publish a site to one or more domains",
      category: "Webflow",
      stepFunction: "publishSiteStep",
      stepImportPath: "publish-site",
      outputFields: [
        { field: "publishedDomains", description: "Array of published domain URLs" },
        { field: "publishedToSubdomain", description: "Whether published to Webflow subdomain" },
      ],
      configFields: [
        {
          key: "siteId",
          label: "Site ID",
          type: "template-input",
          placeholder: "site-id or {{NodeName.id}}",
          example: "580e63e98c9a982ac9b8b741",
          required: true,
        },
        {
          key: "publishToWebflowSubdomain",
          label: "Publish to Webflow Subdomain",
          type: "select",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
          defaultValue: "true",
        },
        {
          key: "customDomainIds",
          label: "Custom Domain IDs (comma-separated)",
          type: "template-input",
          placeholder: "domain-id-1, domain-id-2",
          example: "589a331aa51e760df7ccb89d",
        },
      ],
    },
  ],
};

registerIntegration(webflowPlugin);

export default webflowPlugin;
