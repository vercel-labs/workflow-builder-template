/**
 * AI Gateway Managed Keys Configuration
 *
 * This feature allows signed-in users to use their own Vercel AI Gateway
 * API keys (and credits) instead of manually entering an API key.
 *
 * The AI Gateway itself is available to everyone via AI_GATEWAY_API_KEY.
 * This feature flag only controls the ability to create API keys on behalf
 * of users through OAuth - which is an internal Vercel feature.
 *
 * Set AI_GATEWAY_MANAGED_KEYS_ENABLED=true to enable.
 */

export function isAiGatewayManagedKeysEnabled(): boolean {
  return process.env.AI_GATEWAY_MANAGED_KEYS_ENABLED === "true";
}

/**
 * Check if managed keys feature is enabled on the client side
 * Uses NEXT_PUBLIC_ prefix for client-side access
 */
export function isAiGatewayManagedKeysEnabledClient(): boolean {
  if (typeof window === "undefined") {
    return process.env.AI_GATEWAY_MANAGED_KEYS_ENABLED === "true";
  }
  return process.env.NEXT_PUBLIC_AI_GATEWAY_MANAGED_KEYS_ENABLED === "true";
}
