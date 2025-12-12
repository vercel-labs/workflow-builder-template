import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { WebhookIcon } from "./icon";

const webhookPlugin: IntegrationPlugin = {
  type: "webhook",
  label: "Webhook",
  description: "Send HTTP requests to webhook endpoints",

  icon: WebhookIcon,

  // No integration required - users provide URL and config directly in each step
  requiresIntegration: false,

  // No credentials needed - users provide URL and config directly in each step
  formFields: [
    {
      id: "info",
      label: "Webhook Configuration",
      type: "text",
      placeholder: "No configuration needed",
      configKey: "info",
      helpText: "Configure webhook URL, method, headers, and payload directly in each webhook action.",
    },
  ],

  // No test function needed since there are no credentials to test
  // Users provide webhook URL per-step

  actions: [
    {
      slug: "send-webhook",
      label: "Send Webhook",
      description: "Send an HTTP request to a webhook endpoint",
      category: "Webhook",
      stepFunction: "sendWebhookStep",
      stepImportPath: "send-webhook",
      outputFields: [
        { field: "success", description: "Whether the webhook was sent successfully" },
        { field: "statusCode", description: "HTTP status code from the response" },
        { field: "response", description: "Response body from the webhook endpoint" },
        { field: "error", description: "Error message if failed" },
      ],
      configFields: [
        {
          key: "webhookUrl",
          label: "URL",
          type: "template-input",
          placeholder: "https://example.com/webhook or {{NodeName.url}}",
          example: "https://example.com/webhook",
          required: true,
        },
        {
          key: "webhookMethod",
          label: "HTTP Method",
          type: "select",
          options: [
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ],
          defaultValue: "POST",
          required: true,
        },
        {
          key: "webhookHeaders",
          label: "Headers",
          type: "template-textarea",
          placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
          rows: 4,
          example: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
          required: false,
        },
        {
          key: "webhookPayload",
          label: "Payload",
          type: "template-textarea",
          placeholder: '{"key": "value", "data": {{NodeName.field}}}',
          rows: 6,
          example: '{"key": "value", "data": "example"}',
          required: false,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(webhookPlugin);

export default webhookPlugin;

