import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents, workflowExecutions } from "@/lib/db/schema";

type RateLimitConfig = {
  maxRequests: number;
  windowInHours: number;
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI generation: 50 requests per hour
  aiGenerate: { maxRequests: 50, windowInHours: 1 },
  // Webhook execution: 1000 requests per hour
  webhookExecute: { maxRequests: 1000, windowInHours: 1 },
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Check rate limit for workflow executions
 */
export async function checkExecutionRateLimit(
  userId: string,
  limitKey: "webhookExecute" = "webhookExecute"
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[limitKey];
  const windowStart = new Date(
    Date.now() - config.windowInHours * 60 * 60 * 1000
  );
  const resetAt = new Date(Date.now() + config.windowInHours * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: count(workflowExecutions.id) })
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.userId, userId),
        gte(workflowExecutions.startedAt, windowStart)
      )
    );

  const currentCount = result?.count ?? 0;
  const remaining = Math.max(0, config.maxRequests - currentCount);

  return {
    allowed: currentCount < config.maxRequests,
    remaining,
    resetAt,
  };
}

/**
 * Check rate limit for AI generation requests (database-backed)
 */
export async function checkAIRateLimit(
  userId: string,
  limitKey: "aiGenerate" = "aiGenerate"
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[limitKey];
  const windowStart = new Date(
    Date.now() - config.windowInHours * 60 * 60 * 1000
  );
  const resetAt = new Date(Date.now() + config.windowInHours * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: count(rateLimitEvents.id) })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.userId, userId),
        eq(rateLimitEvents.eventType, "ai_generate"),
        gte(rateLimitEvents.createdAt, windowStart)
      )
    );

  const currentCount = result?.count ?? 0;
  const remaining = Math.max(0, config.maxRequests - currentCount);

  if (currentCount >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Record this request
  await db.insert(rateLimitEvents).values({
    userId,
    eventType: "ai_generate",
  });

  return {
    allowed: true,
    remaining: remaining - 1,
    resetAt,
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
