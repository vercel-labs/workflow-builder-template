import "server-only";

/**
 * Workflow Integrations
 *
 * This module exports all available integrations for workflows
 * SERVER-SIDE ONLY - Do not import in client components
 */

// biome-ignore lint/performance/noBarrelFile: Intentional barrel file for integration exports
export * from "./api";
export * from "./database";
export * from "./linear";
export * from "./resend";
export * from "./slack";
export * from "./vercel";

// Helper to get user data (placeholder - should integrate with your auth system)
export function getUser(userId: string) {
  // This would normally query your user database
  return {
    id: userId,
    name: "John Doe",
    email: "john@example.com",
    plan: "Pro",
  };
}
