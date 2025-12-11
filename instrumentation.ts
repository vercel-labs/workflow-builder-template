/**
 * Next.js instrumentation file
 * This runs once when the server starts (before any requests are handled)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Patch console with LOG_LEVEL support
  // This must be imported dynamically to ensure it runs at startup
  await import("@/lib/logger");

  // Only register process handlers in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Catch unhandled promise rejections (would otherwise be silent)
    process.on("unhandledRejection", (reason) => {
      console.error(
        "Unhandled Rejection:",
        reason instanceof Error ? reason.message : reason,
        reason instanceof Error ? reason.stack : ""
      );
    });

    // Catch uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error.message, error.stack);
    });
  }
}
