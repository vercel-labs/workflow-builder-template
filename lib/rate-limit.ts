import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";

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

// In-memory rate limit for AI generation (doesn't persist to DB)
const aiRequestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for AI generation requests (in-memory)
 */
export function checkAIRateLimit(
  userId: string,
  limitKey: "aiGenerate" = "aiGenerate"
): RateLimitResult {
  const config = RATE_LIMITS[limitKey];
  const now = Date.now();
  const windowMs = config.windowInHours * 60 * 60 * 1000;

  const existing = aiRequestCounts.get(userId);

  // Reset if window has passed
  if (!existing || now > existing.resetAt) {
    aiRequestCounts.set(userId, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  // Check if within limit
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
    };
  }

  // Increment count
  existing.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: new Date(existing.resetAt),
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
