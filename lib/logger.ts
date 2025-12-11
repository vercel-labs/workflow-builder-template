/**
 * Console wrapper with LOG_LEVEL support
 *
 * LOG_LEVEL can be: "debug" | "info" | "warn" | "error" | "silent"
 *
 * Import this file once at app startup to patch console globally.
 * All existing console.log/warn/error calls will respect LOG_LEVEL.
 *
 * In staging, set LOG_LEVEL=debug to see all logs
 * In production, set LOG_LEVEL=warn or LOG_LEVEL=error
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Regex patterns for stack trace parsing (top-level for performance)
const STACK_PATTERN_PARENS = /\((.+):(\d+):\d+\)$/;
const STACK_PATTERN_AT = /at (.+):(\d+):\d+$/;
const PATH_STRIP_PATTERN = /^.*\//;

function getLogLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
  return LOG_LEVELS[level] !== undefined ? level : "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function getCallerLocation(): string {
  const err = new Error("stack");
  const stack = err.stack?.split("\n") || [];
  // Stack: Error -> getCallerLocation -> formatArgs -> console.X wrapper -> actual caller
  // We want index 4 (the actual caller)
  const callerLine = stack[4] || "";

  // Extract file:line from stack trace
  // Formats: "at functionName (file:line:col)" or "at file:line:col"
  const match =
    callerLine.match(STACK_PATTERN_PARENS) ||
    callerLine.match(STACK_PATTERN_AT);

  if (match) {
    const file = match[1].replace(PATH_STRIP_PATTERN, ""); // Get just filename
    const line = match[2];
    return `${file}:${line}`;
  }
  return "";
}

function formatArgs(prefix: string, args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString();
  // Only include source references when LOG_LEVEL is debug
  const includeLocation = getLogLevel() === "debug";
  const location = includeLocation ? getCallerLocation() : "";
  const locationStr = location ? ` (${location})` : "";
  return [`[${timestamp}] ${prefix}${locationStr}`, ...args];
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

// Patch console methods
console.debug = (...args: unknown[]) => {
  if (shouldLog("debug")) {
    originalConsole.debug(...formatArgs("[DEBUG]", args));
  }
};

console.log = (...args: unknown[]) => {
  if (shouldLog("info")) {
    originalConsole.log(...formatArgs("[LOG]", args));
  }
};

console.info = (...args: unknown[]) => {
  if (shouldLog("info")) {
    originalConsole.info(...formatArgs("[INFO]", args));
  }
};

console.warn = (...args: unknown[]) => {
  if (shouldLog("warn")) {
    originalConsole.warn(...formatArgs("[WARN]", args));
  }
};

console.error = (...args: unknown[]) => {
  if (shouldLog("error")) {
    originalConsole.error(...formatArgs("[ERROR]", args));
  }
};

// Log that patching occurred (at debug level)
if (shouldLog("debug")) {
  originalConsole.debug(
    `[${new Date().toISOString()}] [DEBUG] Console patched with LOG_LEVEL=${getLogLevel()}`
  );
}

// Export to make this a module (required for dynamic import)
export {};
