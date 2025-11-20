/**
 * Utility functions for redacting sensitive data from inputs/outputs
 * before storage or display in observability tools
 */

/**
 * List of sensitive field keys that should be redacted
 */
const SENSITIVE_KEYS = new Set([
  // API Keys
  "apiKey",
  "api_key",
  "apikey",
  "key",

  // Credentials
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "privateKey",
  "private_key",

  // Database
  "databaseUrl",
  "database_url",
  "connectionString",
  "connection_string",

  // Email
  "fromEmail",
  "from_email",

  // Authentication
  "authorization",
  "auth",
  "bearer",

  // Credit Card/Payment
  "creditCard",
  "credit_card",
  "cardNumber",
  "card_number",
  "cvv",
  "ssn",

  // Personal Info
  "phoneNumber",
  "phone_number",
  "socialSecurity",
  "social_security",
]);

/**
 * Patterns that indicate a field contains sensitive data
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /auth/i,
];

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  // Exact match
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return true;
  }

  // Pattern match
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Mask a sensitive value, showing only last 4 characters
 */
function maskValue(value: string): string {
  if (!value || value.length === 0) {
    return "[REDACTED]";
  }

  if (value.length <= 4) {
    return "****";
  }

  const last4 = value.slice(-4);
  const stars = "*".repeat(Math.min(8, value.length - 4));
  return `${stars}${last4}`;
}

/**
 * Recursively redact sensitive data from an object
 */
// biome-ignore lint/suspicious/noExplicitAny: Redaction works on arbitrary data structures
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Function handles multiple data types and recursive structures
function redactObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        // Redact sensitive fields
        if (typeof value === "string") {
          redacted[key] = maskValue(value);
        } else {
          redacted[key] = "[REDACTED]";
        }
      } else {
        // Recursively process nested objects
        redacted[key] = redactObject(value, depth + 1);
      }
    }

    return redacted;
  }

  return obj;
}

/**
 * Redact sensitive data from any value
 * This is the main export that should be used throughout the application
 */
// biome-ignore lint/suspicious/noExplicitAny: Redaction works on arbitrary data structures
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  try {
    return redactObject(data);
  } catch (error) {
    console.error("[Redact] Error redacting data:", error);
    return "[REDACTION_ERROR]";
  }
}

/**
 * Check if credentials object contains any sensitive data
 * Used to determine if credentials should be completely excluded
 */
export function containsSensitiveData(obj: Record<string, unknown>): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (isSensitiveKey(key)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove all credentials from an object
 * Use this when you want to completely strip out sensitive data
 */
// biome-ignore lint/suspicious/noExplicitAny: Works on arbitrary data structures
export function stripCredentials(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripCredentials);
  }

  const stripped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!isSensitiveKey(key)) {
      if (typeof value === "object" && value !== null) {
        stripped[key] = stripCredentials(value);
      } else {
        stripped[key] = value;
      }
    }
  }

  return stripped;
}
