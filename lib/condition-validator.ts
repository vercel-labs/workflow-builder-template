/**
 * Condition Expression Validator
 *
 * Validates and sanitizes condition expressions before evaluation.
 * This prevents arbitrary code execution while allowing useful comparisons.
 *
 * Allowed syntax:
 * - Template variables: {{@nodeId:Label.field}} (replaced with safe __v0, __v1, etc.)
 * - Comparison operators: ===, !==, ==, !=, >, <, >=, <=
 * - Logical operators: &&, ||, !
 * - Grouping: ( )
 * - Literals: strings ('...', "..."), numbers, true, false, null, undefined
 * - Property access on variables: __v0.property, __v0[0], __v0["key"]
 * - Array methods: .includes(), .length
 * - String methods: .startsWith(), .endsWith(), .includes()
 *
 * NOT allowed:
 * - Function calls (except allowed methods)
 * - Assignment operators (=, +=, -=, etc.)
 * - Code execution constructs (eval, Function, import, require)
 * - Property assignment
 * - Array/object literals ([1,2,3], {key: value})
 * - Comments
 */

// Dangerous patterns that should never appear in conditions
const DANGEROUS_PATTERNS = [
  // Assignment operators
  /(?<![=!<>])=(?!=)/g, // = but not ==, ===, !=, !==, <=, >=
  /\+=|-=|\*=|\/=|%=|\^=|\|=|&=/g,
  // Code execution
  /\beval\s*\(/gi,
  /\bFunction\s*\(/gi,
  /\bimport\s*\(/gi,
  /\brequire\s*\(/gi,
  /\bnew\s+\w/gi,
  // Dangerous globals
  /\bprocess\b/gi,
  /\bglobal\b/gi,
  /\bwindow\b/gi,
  /\bdocument\b/gi,
  /\bconstructor\b/gi,
  /\b__proto__\b/gi,
  /\bprototype\b/gi,
  // Control flow that could be exploited
  /\bwhile\s*\(/gi,
  /\bfor\s*\(/gi,
  /\bdo\s*\{/gi,
  /\bswitch\s*\(/gi,
  /\btry\s*\{/gi,
  /\bcatch\s*\(/gi,
  /\bfinally\s*\{/gi,
  /\bthrow\s+/gi,
  /\breturn\s+/gi,
  // Template literals with expressions (could execute code)
  /`[^`]*\$\{/g,
  // Object literals (but NOT bracket property access)
  /\{\s*\w+\s*:/g,
  // Increment/decrement
  /\+\+|--/g,
  // Bitwise operators (rarely needed, often used in exploits)
  /<<|>>|>>>/g,
  // Comma operator (can chain expressions)
  /,(?![^(]*\))/g, // Comma not inside function call parentheses
  // Semicolons (statement separator)
  /;/g,
];

// Allowed method names that can be called
const ALLOWED_METHODS = new Set([
  "includes",
  "startsWith",
  "endsWith",
  "toString",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "length", // Actually a property, but accessed like .length
]);

// Pattern to match method calls
const METHOD_CALL_PATTERN = /\.(\w+)\s*\(/g;

// Pattern to match bracket expressions: captures what's before and inside the brackets
const BRACKET_EXPRESSION_PATTERN = /(\w+)\s*\[([^\]]+)\]/g;

// Pattern for valid variable property access: __v0[0], __v0["key"], __v0['key']
const VALID_BRACKET_ACCESS_PATTERN = /^__v\d+$/;
const VALID_BRACKET_CONTENT_PATTERN = /^(\d+|'[^']*'|"[^"]*")$/;

// Top-level regex patterns for token validation
const WHITESPACE_SPLIT_PATTERN = /\s+/;
const VARIABLE_TOKEN_PATTERN = /^__v\d+/;
const STRING_TOKEN_PATTERN = /^['"]/;
const NUMBER_TOKEN_PATTERN = /^\d/;
const LITERAL_TOKEN_PATTERN = /^(true|false|null|undefined)$/;
const OPERATOR_TOKEN_PATTERN = /^(===|!==|==|!=|>=|<=|>|<|&&|\|\||!|\(|\))$/;
const IDENTIFIER_TOKEN_PATTERN = /^[a-zA-Z_]\w*$/;

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Check for dangerous patterns in the expression
 */
function checkDangerousPatterns(expression: string): ValidationResult {
  for (const pattern of DANGEROUS_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    if (pattern.test(expression)) {
      pattern.lastIndex = 0;
      const match = expression.match(pattern);
      return {
        valid: false,
        error: `Condition contains disallowed syntax: "${match?.[0] || "unknown"}"`,
      };
    }
  }
  return { valid: true };
}

/**
 * Check bracket expressions to distinguish between:
 * - Allowed: Variable property access like __v0[0], __v0["key"], __v0['key']
 * - Blocked: Array literals like [1,2,3], or dangerous expressions like __v0[eval('x')]
 */
function checkBracketExpressions(expression: string): ValidationResult {
  BRACKET_EXPRESSION_PATTERN.lastIndex = 0;

  // Use exec loop for compatibility
  let match: RegExpExecArray | null = null;
  while (true) {
    match = BRACKET_EXPRESSION_PATTERN.exec(expression);
    if (match === null) {
      break;
    }

    const beforeBracket = match[1];
    const insideBracket = match[2].trim();

    // Check if the part before the bracket is a valid variable (__v0, __v1, etc.)
    if (!VALID_BRACKET_ACCESS_PATTERN.test(beforeBracket)) {
      return {
        valid: false,
        error: `Bracket notation is only allowed on workflow variables. Found: "${beforeBracket}[...]"`,
      };
    }

    // Check if the content inside brackets is safe (number or string literal)
    if (!VALID_BRACKET_CONTENT_PATTERN.test(insideBracket)) {
      return {
        valid: false,
        error: `Invalid bracket content: "[${insideBracket}]". Only numeric indices or string literals are allowed.`,
      };
    }
  }

  // Check for standalone array literals (brackets not preceded by a variable)
  // This catches cases like "[1, 2, 3]" at the start of expression or after operators
  const standaloneArrayPattern = /(?:^|[=!<>&|(\s])\s*\[/g;
  standaloneArrayPattern.lastIndex = 0;
  if (standaloneArrayPattern.test(expression)) {
    return {
      valid: false,
      error:
        "Array literals are not allowed in conditions. Use workflow variables instead.",
    };
  }

  return { valid: true };
}

/**
 * Check that all method calls use allowed methods
 */
function checkMethodCalls(expression: string): ValidationResult {
  METHOD_CALL_PATTERN.lastIndex = 0;

  // Use exec loop for compatibility
  let match: RegExpExecArray | null = null;
  while (true) {
    match = METHOD_CALL_PATTERN.exec(expression);
    if (match === null) {
      break;
    }

    const methodName = match[1];
    if (!ALLOWED_METHODS.has(methodName)) {
      return {
        valid: false,
        error: `Method "${methodName}" is not allowed in conditions. Allowed methods: ${Array.from(ALLOWED_METHODS).join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check that parentheses are balanced
 */
function checkParentheses(expression: string): ValidationResult {
  let parenDepth = 0;

  for (const char of expression) {
    if (char === "(") {
      parenDepth += 1;
    }
    if (char === ")") {
      parenDepth -= 1;
    }
    if (parenDepth < 0) {
      return { valid: false, error: "Unbalanced parentheses in condition" };
    }
  }

  if (parenDepth !== 0) {
    return { valid: false, error: "Unbalanced parentheses in condition" };
  }

  return { valid: true };
}

/**
 * Check if a token is valid
 */
function isValidToken(token: string): boolean {
  // Skip known valid patterns
  if (VARIABLE_TOKEN_PATTERN.test(token)) {
    return true;
  }
  if (STRING_TOKEN_PATTERN.test(token)) {
    return true;
  }
  if (NUMBER_TOKEN_PATTERN.test(token)) {
    return true;
  }
  if (LITERAL_TOKEN_PATTERN.test(token)) {
    return true;
  }
  if (OPERATOR_TOKEN_PATTERN.test(token)) {
    return true;
  }
  return false;
}

/**
 * Check for unauthorized identifiers in the expression
 */
function checkUnauthorizedIdentifiers(expression: string): ValidationResult {
  const tokens = expression.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);

  for (const token of tokens) {
    if (isValidToken(token)) {
      continue;
    }

    // Check if it looks like an unauthorized identifier
    if (IDENTIFIER_TOKEN_PATTERN.test(token) && !token.startsWith("__v")) {
      return {
        valid: false,
        error: `Unknown identifier "${token}" in condition. Use template variables like {{@nodeId:Label.field}} to reference workflow data.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate a condition expression after template variables have been replaced
 *
 * @param expression - The expression with template vars replaced (e.g., "__v0 === 'test'")
 * @returns ValidationResult indicating if the expression is safe to evaluate
 */
export function validateConditionExpression(
  expression: string
): ValidationResult {
  // Empty expressions are invalid
  if (!expression || expression.trim() === "") {
    return { valid: false, error: "Condition expression cannot be empty" };
  }

  // Check for dangerous patterns
  const dangerousCheck = checkDangerousPatterns(expression);
  if (!dangerousCheck.valid) {
    return dangerousCheck;
  }

  // Check bracket expressions (array access vs array literals)
  const bracketCheck = checkBracketExpressions(expression);
  if (!bracketCheck.valid) {
    return bracketCheck;
  }

  // Check method calls are allowed
  const methodCheck = checkMethodCalls(expression);
  if (!methodCheck.valid) {
    return methodCheck;
  }

  // Validate balanced parentheses
  const parenCheck = checkParentheses(expression);
  if (!parenCheck.valid) {
    return parenCheck;
  }

  // Check for unauthorized identifiers
  const identifierCheck = checkUnauthorizedIdentifiers(expression);
  if (!identifierCheck.valid) {
    return identifierCheck;
  }

  return { valid: true };
}

/**
 * Check if a raw expression (before template replacement) looks safe
 * This is a quick pre-check before the more thorough validation
 */
export function preValidateConditionExpression(
  expression: string
): ValidationResult {
  if (!expression || typeof expression !== "string") {
    return { valid: false, error: "Condition must be a non-empty string" };
  }

  // Check for obviously dangerous patterns before any processing
  const dangerousKeywords = [
    "eval",
    "Function",
    "import",
    "require",
    "process",
    "global",
    "window",
    "document",
    "__proto__",
    "constructor",
    "prototype",
  ];

  const lowerExpression = expression.toLowerCase();
  for (const keyword of dangerousKeywords) {
    if (lowerExpression.includes(keyword.toLowerCase())) {
      return {
        valid: false,
        error: `Condition contains disallowed keyword: "${keyword}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize an expression by escaping potentially dangerous characters
 * This is used as an additional safety measure
 */
export function sanitizeForDisplay(expression: string): string {
  return expression
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
