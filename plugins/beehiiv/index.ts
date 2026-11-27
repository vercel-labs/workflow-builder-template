import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { BeehiivIcon } from "./icon";

const beehiivPlugin: IntegrationPlugin = {
  type: "beehiiv",
  label: "Beehiiv",
  description: "Newsletter platform for creators and publishers",

  icon: BeehiivIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "...",
      configKey: "apiKey",
      envVar: "BEEHIIV_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "Beehiiv Dashboard",
        url: "https://app.beehiiv.com/settings/workspace/api",
      },
    },
    {
      id: "publicationId",
      label: "Publication ID",
      type: "text",
      placeholder: "pub_00000000-0000-0000-0000-000000000000",
      configKey: "publicationId",
      envVar: "BEEHIIV_PUBLICATION_ID",
      helpText: "Get your publication ID from ",
      helpLink: {
        text: "Beehiiv Dashboard",
        url: "https://app.beehiiv.com/settings/workspace/api",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testBeehiiv } = await import("./test");
      return testBeehiiv;
    },
  },

  actions: [
    {
      slug: "create-subscription",
      label: "Create Subscription",
      description: "Create a new subscription for a publication",
      category: "Beehiiv",
      stepFunction: "createSubscriptionStep",
      stepImportPath: "create-subscription",
      outputFields: [
        { field: "id", description: "Subscription ID" },
        { field: "email", description: "Subscriber email" },
        { field: "status", description: "Subscription status" },
      ],
      configFields: [
        {
          key: "email",
          label: "Email",
          type: "template-input",
          placeholder: "subscriber@example.com or {{NodeName.email}}",
          example: "subscriber@example.com",
          required: true,
        },
        {
          key: "reactivateExisting",
          label: "Reactivate Existing",
          type: "select",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
          defaultValue: "false",
        },
        {
          key: "sendWelcomeEmail",
          label: "Send Welcome Email",
          type: "select",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
          defaultValue: "false",
        },
        {
          key: "doubleOptOverride",
          label: "Double Opt-In",
          type: "select",
          options: [
            { value: "not_set", label: "Use Publication Default" },
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ],
          defaultValue: "not_set",
        },
        {
          key: "tier",
          label: "Subscription Tier",
          type: "select",
          options: [
            { value: "free", label: "Free" },
            { value: "premium", label: "Premium" },
          ],
        },
        {
          type: "group",
          label: "Attribution",
          fields: [
            {
              key: "utmSource",
              label: "UTM Source",
              type: "template-input",
              placeholder: "WayneEnterprise",
              example: "WayneEnterprise",
            },
            {
              key: "utmMedium",
              label: "UTM Medium",
              type: "template-input",
              placeholder: "organic",
              example: "organic",
            },
            {
              key: "utmCampaign",
              label: "UTM Campaign",
              type: "template-input",
              placeholder: "fall_2022_promotion",
              example: "fall_2022_promotion",
            },
            {
              key: "referringSite",
              label: "Referring Site",
              type: "template-input",
              placeholder: "www.example.com/blog",
              example: "www.wayneenterprise.com/blog",
            },
          ],
        },
      ],
    },
    {
      slug: "get-subscription",
      label: "Get Subscription",
      description: "Get subscription details by email",
      category: "Beehiiv",
      stepFunction: "getSubscriptionStep",
      stepImportPath: "get-subscription",
      outputFields: [
        { field: "id", description: "Subscription ID" },
        { field: "email", description: "Subscriber email" },
        { field: "status", description: "Subscription status" },
        { field: "created", description: "Creation timestamp" },
        { field: "subscriptionTier", description: "Subscription tier" },
      ],
      configFields: [
        {
          key: "email",
          label: "Email",
          type: "template-input",
          placeholder: "subscriber@example.com or {{NodeName.email}}",
          example: "subscriber@example.com",
          required: true,
        },
        {
          key: "expand",
          label: "Include Additional Data",
          type: "select",
          options: [
            { value: "none", label: "None" },
            { value: "stats", label: "Stats" },
            { value: "custom_fields", label: "Custom Fields" },
            { value: "referrals", label: "Referrals" },
            { value: "tags", label: "Tags" },
            { value: "subscription_premium_tiers", label: "Premium Tiers" },
          ],
          defaultValue: "none",
        },
      ],
    },
    {
      slug: "update-subscription",
      label: "Update Subscription",
      description: "Update subscription details by email",
      category: "Beehiiv",
      stepFunction: "updateSubscriptionStep",
      stepImportPath: "update-subscription",
      outputFields: [
        { field: "id", description: "Subscription ID" },
        { field: "email", description: "Subscriber email" },
        { field: "status", description: "Subscription status" },
      ],
      configFields: [
        {
          key: "email",
          label: "Email",
          type: "template-input",
          placeholder: "subscriber@example.com or {{NodeName.email}}",
          example: "subscriber@example.com",
          required: true,
        },
        {
          key: "tier",
          label: "Subscription Tier",
          type: "select",
          options: [
            { value: "none", label: "No Change" },
            { value: "free", label: "Free" },
            { value: "premium", label: "Premium" },
          ],
          defaultValue: "none",
        },
        {
          key: "unsubscribe",
          label: "Unsubscribe",
          type: "select",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
          defaultValue: "false",
        },
      ],
    },
    {
      slug: "add-subscription-tag",
      label: "Add Subscription Tag",
      description: "Add tags to a subscription",
      category: "Beehiiv",
      stepFunction: "addSubscriptionTagStep",
      stepImportPath: "add-subscription-tag",
      outputFields: [
        { field: "id", description: "Subscription ID" },
        { field: "email", description: "Subscriber email" },
        { field: "tags", description: "Subscription tags" },
      ],
      configFields: [
        {
          key: "subscriptionId",
          label: "Subscription ID",
          type: "template-input",
          placeholder: "{{GetSubscription.id}}",
          example: "sub_00000000-0000-0000-0000-000000000000",
          required: true,
        },
        {
          key: "tags",
          label: "Tag(s)",
          type: "template-input",
          placeholder: "Premium, VIP",
          example: "Premium, Basic",
          required: true,
        },
      ],
    },
    {
      slug: "add-to-automation",
      label: "Add to Automation",
      description: "Add an existing subscription to an automation flow",
      category: "Beehiiv",
      stepFunction: "addToAutomationStep",
      stepImportPath: "add-to-automation",
      outputFields: [
        { field: "id", description: "Journey ID" },
        { field: "automationId", description: "Automation ID" },
        { field: "status", description: "Journey status" },
      ],
      configFields: [
        {
          key: "automationId",
          label: "Automation ID",
          type: "template-input",
          placeholder: "aut_00000000-0000-0000-0000-000000000000",
          example: "aut_00000000-0000-0000-0000-000000000000",
          required: true,
        },
        {
          key: "subscriptionId",
          label: "Subscription ID",
          type: "template-input",
          placeholder: "{{GetSubscription.id}}",
          example: "sub_00000000-0000-0000-0000-000000000000",
          required: true,
        },
        {
          key: "doubleOptOverride",
          label: "Double Opt-In",
          type: "select",
          options: [
            { value: "not_set", label: "Use Publication Default" },
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ],
          defaultValue: "not_set",
        },
      ],
    },
  ],
};

registerIntegration(beehiivPlugin);

export default beehiivPlugin;
