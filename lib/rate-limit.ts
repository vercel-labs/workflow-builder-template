import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

// Create Redis client with KV_ prefix
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

// AI generation: 50 requests per hour
const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 h"),
  prefix: "ratelimit:ai",
});

// Webhook execution: 1000 requests per hour
const webhookRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, "1 h"),
  prefix: "ratelimit:webhook",
});

/**
 * Check rate limit for AI generation requests
 */
export async function checkAIRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const { success, remaining, reset } = await aiRatelimit.limit(userId);

  return {
    allowed: success,
    remaining,
    resetAt: new Date(reset),
  };
}

/**
 * Check rate limit for workflow executions
 */
export async function checkExecutionRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const { success, remaining, reset } = await webhookRatelimit.limit(userId);

  return {
    allowed: success,
    remaining,
    resetAt: new Date(reset),
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}
