import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { BlobIcon } from "./icon";

const blobPlugin: IntegrationPlugin = {
  type: "blob",
  label: "Blob",
  description: "Store and retrieve files with Vercel Blob",

  icon: BlobIcon,

  formFields: [
    {
      id: "token",
      label: "Read/Write Token",
      type: "password",
      placeholder: "vercel_blob_rw_...",
      configKey: "token",
      envVar: "BLOB_READ_WRITE_TOKEN",
      helpText: "Get your token from ",
      helpLink: {
        text: "vercel.com/dashboard/stores",
        url: "https://vercel.com/dashboard/stores",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testBlob } = await import("./test");
      return testBlob;
    },
  },

  actions: [
    {
      slug: "put",
      label: "Put Blob",
      description: "Upload a file to Vercel Blob storage",
      category: "Blob",
      stepFunction: "putBlobStep",
      stepImportPath: "put",
      outputFields: [
        { field: "url", description: "Public URL of the blob" },
        { field: "downloadUrl", description: "Direct download URL" },
        { field: "pathname", description: "Path where blob was stored" },
      ],
      configFields: [
        {
          key: "pathname",
          label: "Path",
          type: "template-input",
          placeholder: "folder/filename.txt or {{NodeName.path}}",
          example: "uploads/document.pdf",
          required: true,
        },
        {
          key: "body",
          label: "Content",
          type: "template-textarea",
          placeholder: "File content or {{NodeName.data}}",
          rows: 4,
          example: "Hello, world!",
          required: true,
        },
        {
          key: "contentType",
          label: "Content Type",
          type: "template-input",
          placeholder: "text/plain",
          example: "text/plain",
        },
        {
          type: "group",
          label: "Options",
          defaultExpanded: false,
          fields: [
            {
              key: "access",
              label: "Access",
              type: "select",
              options: [
                { value: "public", label: "Public" },
              ],
              defaultValue: "public",
            },
            {
              key: "addRandomSuffix",
              label: "Add Random Suffix",
              type: "select",
              options: [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ],
              defaultValue: "true",
            },
          ],
        },
      ],
    },
    {
      slug: "list",
      label: "List Blobs",
      description: "List files stored in Vercel Blob storage",
      category: "Blob",
      stepFunction: "listBlobsStep",
      stepImportPath: "list",
      outputFields: [
        { field: "blobs", description: "Array of blob objects" },
        { field: "hasMore", description: "Whether more results exist" },
        { field: "cursor", description: "Pagination cursor" },
      ],
      configFields: [
        {
          key: "prefix",
          label: "Prefix",
          type: "template-input",
          placeholder: "folder/ or {{NodeName.prefix}}",
          example: "uploads/",
        },
        {
          key: "limit",
          label: "Limit",
          type: "number",
          min: 1,
          defaultValue: "1000",
        },
      ],
    },
  ],
};

registerIntegration(blobPlugin);

export default blobPlugin;

