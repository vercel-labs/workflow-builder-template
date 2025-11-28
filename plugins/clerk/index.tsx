import { User, UserPlus, UserCog, UserX } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { createUserCodegenTemplate } from "./codegen/create-user";
import { deleteUserCodegenTemplate } from "./codegen/delete-user";
import { getUserCodegenTemplate } from "./codegen/get-user";
import { updateUserCodegenTemplate } from "./codegen/update-user";
import { ClerkIcon } from "./icon";
import { ClerkSettings } from "./settings";
import { CreateUserConfigFields } from "./steps/create-user/config";
import { DeleteUserConfigFields } from "./steps/delete-user/config";
import { GetUserConfigFields } from "./steps/get-user/config";
import { UpdateUserConfigFields } from "./steps/update-user/config";

// Export step functions for workflow execution
export { clerkGetUserStep } from "./steps/get-user/step";
export { clerkCreateUserStep } from "./steps/create-user/step";
export { clerkUpdateUserStep } from "./steps/update-user/step";
export { clerkDeleteUserStep } from "./steps/delete-user/step";

const clerkPlugin: IntegrationPlugin = {
  type: "clerk",
  label: "Clerk",
  description: "User authentication and management",

  icon: {
    type: "svg",
    value: "ClerkIcon",
    svgComponent: ClerkIcon,
  },

  settingsComponent: ClerkSettings,

  formFields: [
    {
      id: "clerkSecretKey",
      label: "Secret Key",
      type: "password",
      placeholder: "sk_live_...",
      configKey: "clerkSecretKey",
      helpText: "Get your secret key from ",
      helpLink: {
        text: "Clerk Dashboard",
        url: "https://dashboard.clerk.com",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.clerkSecretKey) {
      creds.CLERK_SECRET_KEY = String(config.clerkSecretKey);
    }
    return creds;
  },

  testConfig: {
    getTestFunction: async () => {
      const { testClerk } = await import("./test");
      return testClerk;
    },
  },

  actions: [
    {
      id: "Get User",
      label: "Get User",
      description: "Fetch a user by ID from Clerk",
      category: "Clerk",
      icon: User,
      stepFunction: "clerkGetUserStep",
      stepImportPath: "get-user",
      configFields: GetUserConfigFields,
      codegenTemplate: getUserCodegenTemplate,
    },
    {
      id: "Create User",
      label: "Create User",
      description: "Create a new user in Clerk",
      category: "Clerk",
      icon: UserPlus,
      stepFunction: "clerkCreateUserStep",
      stepImportPath: "create-user",
      configFields: CreateUserConfigFields,
      codegenTemplate: createUserCodegenTemplate,
    },
    {
      id: "Update User",
      label: "Update User",
      description: "Update an existing user in Clerk",
      category: "Clerk",
      icon: UserCog,
      stepFunction: "clerkUpdateUserStep",
      stepImportPath: "update-user",
      configFields: UpdateUserConfigFields,
      codegenTemplate: updateUserCodegenTemplate,
    },
    {
      id: "Delete User",
      label: "Delete User",
      description: "Delete a user from Clerk",
      category: "Clerk",
      icon: UserX,
      stepFunction: "clerkDeleteUserStep",
      stepImportPath: "delete-user",
      configFields: DeleteUserConfigFields,
      codegenTemplate: deleteUserCodegenTemplate,
    },
  ],
};

// Auto-register on import
registerIntegration(clerkPlugin);

export default clerkPlugin;
