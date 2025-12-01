import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { createUserCodegenTemplate } from "./codegen/create-user";
import { deleteUserCodegenTemplate } from "./codegen/delete-user";
import { getUserCodegenTemplate } from "./codegen/get-user";
import { updateUserCodegenTemplate } from "./codegen/update-user";
import { ClerkIcon } from "./icon";

const clerkPlugin: IntegrationPlugin = {
  type: "clerk",
  label: "Clerk",
  description: "User authentication and management",

  icon: ClerkIcon,

  formFields: [
    {
      id: "clerkSecretKey",
      label: "Secret Key",
      type: "password",
      placeholder: "sk_live_... or sk_test_...",
      configKey: "clerkSecretKey",
      envVar: "CLERK_SECRET_KEY",
      helpText: "Get your secret key from ",
      helpLink: {
        text: "Clerk Dashboard",
        url: "https://dashboard.clerk.com",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testClerk } = await import("./test");
      return testClerk;
    },
  },

  actions: [
    {
      slug: "get-user",
      label: "Get User",
      description: "Fetch a user by ID from Clerk",
      category: "Clerk",
      stepFunction: "clerkGetUserStep",
      stepImportPath: "get-user",
      codegenTemplate: getUserCodegenTemplate,
      configFields: [
        {
          key: "userId",
          label: "User ID",
          type: "template-input",
          placeholder: "user_... or {{NodeName.userId}}",
          example: "user_2abc123",
          required: true,
        },
      ],
    },
    {
      slug: "create-user",
      label: "Create User",
      description: "Create a new user in Clerk",
      category: "Clerk",
      stepFunction: "clerkCreateUserStep",
      stepImportPath: "create-user",
      codegenTemplate: createUserCodegenTemplate,
      configFields: [
        {
          key: "emailAddress",
          label: "Email Address",
          type: "template-input",
          placeholder: "user@example.com or {{NodeName.email}}",
          example: "user@example.com",
          required: true,
        },
        {
          key: "firstName",
          label: "First Name",
          type: "template-input",
          placeholder: "John or {{NodeName.firstName}}",
          example: "John",
        },
        {
          key: "lastName",
          label: "Last Name",
          type: "template-input",
          placeholder: "Doe or {{NodeName.lastName}}",
          example: "Doe",
        },
        {
          key: "password",
          label: "Password",
          type: "template-input",
          placeholder: "Password (min 8 chars) or leave empty",
          example: "securepassword123",
        },
        {
          label: "Metadata",
          type: "group",
          defaultExpanded: false,
          fields: [
            {
              key: "publicMetadata",
              label: "Public Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"role": "admin"} or {{NodeName.metadata}}',
              rows: 3,
            },
            {
              key: "privateMetadata",
              label: "Private Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"internal_id": "123"}',
              rows: 3,
            },
          ],
        },
      ],
    },
    {
      slug: "update-user",
      label: "Update User",
      description: "Update an existing user in Clerk",
      category: "Clerk",
      stepFunction: "clerkUpdateUserStep",
      stepImportPath: "update-user",
      codegenTemplate: updateUserCodegenTemplate,
      configFields: [
        {
          key: "userId",
          label: "User ID",
          type: "template-input",
          placeholder: "user_... or {{NodeName.user.id}}",
          example: "user_2abc123",
          required: true,
        },
        {
          key: "firstName",
          label: "First Name",
          type: "template-input",
          placeholder: "Jane or {{NodeName.firstName}}",
        },
        {
          key: "lastName",
          label: "Last Name",
          type: "template-input",
          placeholder: "Doe or {{NodeName.lastName}}",
        },
        {
          label: "Metadata",
          type: "group",
          defaultExpanded: false,
          fields: [
            {
              key: "publicMetadata",
              label: "Public Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"role": "admin"} or {{NodeName.metadata}}',
              rows: 3,
            },
            {
              key: "privateMetadata",
              label: "Private Metadata (JSON)",
              type: "template-textarea",
              placeholder: '{"internal_id": "123"}',
              rows: 3,
            },
          ],
        },
      ],
    },
    {
      slug: "delete-user",
      label: "Delete User",
      description: "Delete a user from Clerk",
      category: "Clerk",
      stepFunction: "clerkDeleteUserStep",
      stepImportPath: "delete-user",
      codegenTemplate: deleteUserCodegenTemplate,
      configFields: [
        {
          key: "userId",
          label: "User ID",
          type: "template-input",
          placeholder: "user_... or {{NodeName.user.id}}",
          example: "user_2abc123",
          required: true,
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(clerkPlugin);

export default clerkPlugin;
