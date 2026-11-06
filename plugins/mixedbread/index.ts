import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { MixedbreadIcon } from "./icon";

const mixedbreadPlugin: IntegrationPlugin = {
  type: "mixedbread",
  label: "Mixedbread",
  description: "Upload files to Mixedbread document stores",

  icon: MixedbreadIcon,

  formFields: [
    {
      id: "mixedbreadApiKey",
      label: "API Key",
      type: "password",
      placeholder: "mxbai-...",
      configKey: "mixedbreadApiKey",
      envVar: "MIXEDBREAD_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "mixedbread.com",
        url: "https://www.mixedbread.com/dashboard/api-keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testMixedbread } = await import("./test");
      return testMixedbread;
    },
  },

  actions: [
    {
      slug: "ingest-file",
      label: "Ingest File",
      description: "Upload a file to a Mixedbread document store",
      category: "Mixedbread",
      stepFunction: "mixedbreadIngestFileStep",
      stepImportPath: "ingest-file",
      outputFields: [
        { field: "fileId", description: "The ID of the uploaded file" },
        { field: "status", description: "The status of the upload" },
      ],
      configFields: [
        {
          key: "storeIdentifier",
          label: "Store Identifier",
          type: "template-input",
          placeholder: "my-store or {{NodeName.storeId}}",
          example: "my-document-store",
          required: true,
        },
        {
          key: "externalId",
          label: "External ID",
          type: "template-input",
          placeholder: "unique-id or {{NodeName.id}}",
          example: "doc-123",
          required: true,
        },
        {
          key: "content",
          label: "Content",
          type: "template-textarea",
          placeholder: "File content or {{NodeName.content}}",
          example: "Document content here...",
          required: true,
          rows: 5,
        },
        {
          key: "mimetype",
          label: "MIME Type",
          type: "template-input",
          placeholder: "text/plain or {{NodeName.mimetype}}",
          example: "text/plain",
          defaultValue: "text/plain",
          required: true,
        },
        {
          key: "metadata",
          label: "Metadata (JSON)",
          type: "template-textarea",
          placeholder: '{"key": "value"} or {{NodeName.metadata}}',
          example: '{"source": "workflow", "category": "docs"}',
          rows: 3,
        },
      ],
    },
  ],
};

registerIntegration(mixedbreadPlugin);
export default mixedbreadPlugin;
