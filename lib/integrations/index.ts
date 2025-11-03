import 'server-only';

/**
 * Workflow Integrations
 *
 * This module exports all available integrations for workflows
 * SERVER-SIDE ONLY - Do not import in client components
 */

export * from './resend';
export * from './linear';
export * from './slack';
export * from './database';
export * from './api';
export * from './ai-gateway';

// Helper to get user data (placeholder - should integrate with your auth system)
export async function getUser(userId: string) {
  // This would normally query your user database
  return {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'Pro',
  };
}
