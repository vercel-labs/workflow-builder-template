import { NextResponse } from "next/server";

/**
 * Standardized API error handler
 *
 * Logs the error with context and returns a consistent JSON response.
 * All errors flow through the logger which adds timestamps and
 * source locations (in staging with LOG_LEVEL=debug).
 *
 * @param error - The caught error
 * @param context - Description of what operation failed (e.g., "Failed to get workflows")
 * @param status - HTTP status code (default: 500)
 */
export function apiError(
  error: unknown,
  context: string,
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Log with context - will be formatted by our logger
  console.error(`[API] ${context}:`, message, stack ?? "");

  return NextResponse.json(
    {
      error: message,
      context,
    },
    { status }
  );
}
