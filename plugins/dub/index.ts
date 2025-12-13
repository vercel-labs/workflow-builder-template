import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { DubIcon } from "./icon";

const dubPlugin: IntegrationPlugin = {
  type: "dub",
  label: "Dub",
  description: "Create and manage short links",

  icon: DubIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "dub_xxx",
      configKey: "apiKey",
      envVar: "DUB_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "Dub Dashboard",
        url: "https://app.dub.co/settings/tokens",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testDub } = await import("./test");
      return testDub;
    },
  },

  actions: [
    {
      slug: "create-link",
      label: "Create Link",
      description: "Create a new short link",
      category: "Dub",
      stepFunction: "createLinkStep",
      stepImportPath: "create-link",
      outputFields: [
        { field: "id", description: "Unique link ID" },
        { field: "shortLink", description: "The full short URL" },
        { field: "qrCode", description: "QR code URL for the link" },
        { field: "domain", description: "Short link domain" },
        { field: "key", description: "Short link slug" },
        { field: "url", description: "Destination URL" },
      ],
      configFields: [
        {
          key: "url",
          label: "Destination URL",
          type: "template-input",
          placeholder: "https://example.com/page",
          example: "https://example.com/landing-page",
          required: true,
        },
        {
          key: "key",
          label: "Custom Slug",
          type: "template-input",
          placeholder: "my-link",
          example: "summer-sale",
        },
        {
          key: "domain",
          label: "Domain",
          type: "template-input",
          placeholder: "dub.sh",
          example: "dub.sh",
        },
        {
          label: "Link IDs",
          type: "group",
          fields: [
            {
              key: "externalId",
              label: "External ID",
              type: "template-input",
              placeholder: "my-external-id",
            },
            {
              key: "tenantId",
              label: "Tenant ID",
              type: "template-input",
              placeholder: "tenant-123",
            },
            {
              key: "programId",
              label: "Program ID",
              type: "template-input",
              placeholder: "program-123",
            },
            {
              key: "partnerId",
              label: "Partner ID",
              type: "template-input",
              placeholder: "partner-123",
            },
          ],
        },
        {
          label: "Link Preview",
          type: "group",
          fields: [
            {
              key: "title",
              label: "Title",
              type: "template-input",
              placeholder: "Custom preview title",
            },
            {
              key: "description",
              label: "Description",
              type: "template-input",
              placeholder: "Custom preview description",
            },
            {
              key: "image",
              label: "Image URL",
              type: "template-input",
              placeholder: "https://example.com/image.png",
            },
            {
              key: "video",
              label: "Video URL",
              type: "template-input",
              placeholder: "https://example.com/video.mp4",
            },
          ],
        },
        {
          label: "UTM Parameters",
          type: "group",
          fields: [
            {
              key: "utm_source",
              label: "Source",
              type: "template-input",
              placeholder: "newsletter",
            },
            {
              key: "utm_medium",
              label: "Medium",
              type: "template-input",
              placeholder: "email",
            },
            {
              key: "utm_campaign",
              label: "Campaign",
              type: "template-input",
              placeholder: "summer-sale",
            },
            {
              key: "utm_term",
              label: "Term",
              type: "template-input",
              placeholder: "running+shoes",
            },
            {
              key: "utm_content",
              label: "Content",
              type: "template-input",
              placeholder: "logolink",
            },
          ],
        },
      ],
    },
    {
      slug: "upsert-link",
      label: "Upsert Link",
      description: "Create or update a link by URL or external ID",
      category: "Dub",
      stepFunction: "upsertLinkStep",
      stepImportPath: "upsert-link",
      outputFields: [
        { field: "id", description: "Unique link ID" },
        { field: "shortLink", description: "The full short URL" },
        { field: "qrCode", description: "QR code URL for the link" },
        { field: "domain", description: "Short link domain" },
        { field: "key", description: "Short link slug" },
        { field: "url", description: "Destination URL" },
      ],
      configFields: [
        {
          key: "url",
          label: "Destination URL",
          type: "template-input",
          placeholder: "https://example.com/page",
          example: "https://example.com/landing-page",
          required: true,
        },
        {
          key: "key",
          label: "Custom Slug",
          type: "template-input",
          placeholder: "my-link",
          example: "summer-sale",
        },
        {
          key: "domain",
          label: "Domain",
          type: "template-input",
          placeholder: "dub.sh",
          example: "dub.sh",
        },
        {
          label: "Link IDs",
          type: "group",
          fields: [
            {
              key: "externalId",
              label: "External ID",
              type: "template-input",
              placeholder: "my-external-id",
            },
            {
              key: "tenantId",
              label: "Tenant ID",
              type: "template-input",
              placeholder: "tenant-123",
            },
            {
              key: "programId",
              label: "Program ID",
              type: "template-input",
              placeholder: "program-123",
            },
            {
              key: "partnerId",
              label: "Partner ID",
              type: "template-input",
              placeholder: "partner-123",
            },
          ],
        },
        {
          label: "Link Preview",
          type: "group",
          fields: [
            {
              key: "title",
              label: "Title",
              type: "template-input",
              placeholder: "Custom preview title",
            },
            {
              key: "description",
              label: "Description",
              type: "template-input",
              placeholder: "Custom preview description",
            },
            {
              key: "image",
              label: "Image URL",
              type: "template-input",
              placeholder: "https://example.com/image.png",
            },
            {
              key: "video",
              label: "Video URL",
              type: "template-input",
              placeholder: "https://example.com/video.mp4",
            },
          ],
        },
        {
          label: "UTM Parameters",
          type: "group",
          fields: [
            {
              key: "utm_source",
              label: "Source",
              type: "template-input",
              placeholder: "newsletter",
            },
            {
              key: "utm_medium",
              label: "Medium",
              type: "template-input",
              placeholder: "email",
            },
            {
              key: "utm_campaign",
              label: "Campaign",
              type: "template-input",
              placeholder: "summer-sale",
            },
            {
              key: "utm_term",
              label: "Term",
              type: "template-input",
              placeholder: "running+shoes",
            },
            {
              key: "utm_content",
              label: "Content",
              type: "template-input",
              placeholder: "logolink",
            },
          ],
        },
      ],
    },
  ],
};

registerIntegration(dubPlugin);

export default dubPlugin;
