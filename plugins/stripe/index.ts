import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { StripeIcon } from "./icon";

const stripePlugin: IntegrationPlugin = {
  type: "stripe",
  label: "Stripe",
  description: "Payment processing and billing",

  icon: StripeIcon,

  formFields: [
    {
      id: "apiKey",
      label: "Secret Key",
      type: "password",
      placeholder: "sk_live_... or sk_test_...",
      configKey: "apiKey",
      envVar: "STRIPE_SECRET_KEY",
      helpText: "Get your secret key from ",
      helpLink: {
        text: "dashboard.stripe.com/apikeys",
        url: "https://dashboard.stripe.com/apikeys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testStripe } = await import("./test");
      return testStripe;
    },
  },

  actions: [
    {
      slug: "create-customer",
      label: "Create Customer",
      description: "Create a new customer in Stripe",
      category: "Stripe",
      stepFunction: "createCustomerStep",
      stepImportPath: "create-customer",
      outputFields: [
        { field: "id", description: "Customer ID" },
        { field: "email", description: "Customer email" },
      ],
      configFields: [
        {
          key: "email",
          label: "Email",
          type: "template-input",
          placeholder: "customer@example.com or {{NodeName.email}}",
          example: "customer@example.com",
          required: true,
        },
        {
          key: "name",
          label: "Name",
          type: "template-input",
          placeholder: "John Doe or {{NodeName.name}}",
          example: "John Doe",
        },
        {
          key: "phone",
          label: "Phone",
          type: "template-input",
          placeholder: "+1234567890",
          example: "+1234567890",
        },
        {
          type: "group",
          label: "Additional Details",
          fields: [
            {
              key: "description",
              label: "Description",
              type: "template-input",
              placeholder: "Internal notes about this customer",
              example: "VIP customer",
            },
            {
              key: "metadata",
              label: "Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"key": "value"}',
              example: '{"plan": "enterprise", "source": "website"}',
              rows: 3,
            },
          ],
        },
      ],
    },
    {
      slug: "get-customer",
      label: "Get Customer",
      description: "Retrieve a customer by ID or email",
      category: "Stripe",
      stepFunction: "getCustomerStep",
      stepImportPath: "get-customer",
      outputFields: [
        { field: "id", description: "Customer ID" },
        { field: "email", description: "Customer email" },
        { field: "name", description: "Customer name" },
        { field: "created", description: "Creation timestamp" },
      ],
      configFields: [
        {
          key: "customerId",
          label: "Customer ID",
          type: "template-input",
          placeholder: "cus_... or {{NodeName.customerId}}",
          example: "cus_ABC123",
        },
        {
          key: "email",
          label: "Email (alternative lookup)",
          type: "template-input",
          placeholder: "customer@example.com",
          example: "customer@example.com",
        },
      ],
    },
    {
      slug: "create-invoice",
      label: "Create Invoice",
      description: "Create and optionally send an invoice",
      category: "Stripe",
      stepFunction: "createInvoiceStep",
      stepImportPath: "create-invoice",
      outputFields: [
        { field: "id", description: "Invoice ID" },
        { field: "number", description: "Invoice number" },
        { field: "hostedInvoiceUrl", description: "Hosted invoice URL" },
        { field: "status", description: "Invoice status" },
      ],
      configFields: [
        {
          key: "customerId",
          label: "Customer ID",
          type: "template-input",
          placeholder: "cus_... or {{NodeName.customerId}}",
          example: "cus_ABC123",
          required: true,
        },
        {
          key: "description",
          label: "Description",
          type: "template-input",
          placeholder: "Invoice description",
          example: "Professional services - January 2024",
        },
        {
          key: "lineItems",
          label: "Line Items (JSON array)",
          type: "template-textarea",
          placeholder: '[{"description": "Item", "amount": 1000, "quantity": 1}]',
          example:
            '[{"description": "Consulting", "amount": 15000, "quantity": 2}]',
          rows: 4,
          required: true,
        },
        {
          type: "group",
          label: "Invoice Options",
          fields: [
            {
              key: "daysUntilDue",
              label: "Days Until Due",
              type: "number",
              defaultValue: "30",
              min: 1,
            },
            {
              key: "autoAdvance",
              label: "Auto-finalize",
              type: "select",
              options: [
                { value: "true", label: "Yes" },
                { value: "false", label: "No (draft)" },
              ],
              defaultValue: "true",
            },
            {
              key: "collectionMethod",
              label: "Collection Method",
              type: "select",
              options: [
                { value: "send_invoice", label: "Send Invoice" },
                { value: "charge_automatically", label: "Charge Automatically" },
              ],
              defaultValue: "send_invoice",
            },
            {
              key: "metadata",
              label: "Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"key": "value"}',
              example: '{"project": "website-redesign"}',
              rows: 3,
            },
          ],
        },
      ],
    },
  ],
};

registerIntegration(stripePlugin);

export default stripePlugin;

