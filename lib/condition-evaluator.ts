/**
 * Safe evaluator for workflow condition expressions.
 *
 * Parses the expression into a small AST and interprets it directly, so a
 * condition can only read workflow variables (__v0, __v1, ...), literals,
 * a fixed set of string methods, and operators. Nothing reaches the
 * JavaScript runtime as code.
 */

const ALLOWED_METHODS = new Set([
  "includes",
  "startsWith",
  "endsWith",
  "toString",
  "toLowerCase",
  "toUpperCase",
  "trim",
]);

const BLOCKED_PROPERTIES = new Set(["__proto__", "constructor", "prototype"]);

const VARIABLE_PATTERN = /^__v\d+$/;
const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;
const DIGIT = /\d/;
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const HEX_DIGITS = /^[0-9a-fA-F]+$/;
const SIMPLE_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0",
};

const OPERATORS = [
  "===",
  "!==",
  "==",
  "!=",
  ">=",
  "<=",
  "&&",
  "||",
  ">",
  "<",
  "!",
  "+",
  "-",
  "*",
  "/",
  "%",
  "(",
  ")",
  "[",
  "]",
  ".",
  ",",
  "?",
  ":",
];

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string };

type Node =
  | { type: "literal"; value: unknown }
  | { type: "variable"; name: string }
  | { type: "member"; object: Node; property: string }
  | { type: "call"; object: Node; method: string; args: Node[] }
  | { type: "unary"; operator: string; argument: Node }
  | { type: "binary"; operator: string; left: Node; right: Node }
  | { type: "conditional"; test: Node; consequent: Node; alternate: Node };

const BINARY_PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "===": 3,
  "!==": 3,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

function readHexEscape(hex: string): string {
  if (!HEX_DIGITS.test(hex)) {
    throw new Error("Invalid escape sequence");
  }
  return String.fromCodePoint(Number.parseInt(hex, 16));
}

// Decode the escape that starts after a backslash, matching JavaScript
function readEscape(expression: string, start: number): [string, number] {
  const char = expression[start];

  if (char === "x") {
    return [readHexEscape(expression.slice(start + 1, start + 3)), start + 3];
  }
  if (char === "u" && expression[start + 1] === "{") {
    const close = expression.indexOf("}", start + 2);
    if (close === -1) {
      throw new Error("Invalid escape sequence");
    }
    return [readHexEscape(expression.slice(start + 2, close)), close + 1];
  }
  if (char === "u") {
    return [readHexEscape(expression.slice(start + 1, start + 5)), start + 5];
  }
  if (char === "\r" && expression[start + 1] === "\n") {
    return ["", start + 2];
  }
  if (char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029") {
    return ["", start + 1];
  }
  return [SIMPLE_ESCAPES[char] ?? char, start + 1];
}

function readString(expression: string, start: number): [string, number] {
  const quote = expression[start];
  let value = "";
  let i = start + 1;
  while (i < expression.length && expression[i] !== quote) {
    if (expression[i] === "\\" && i + 1 < expression.length) {
      const [decoded, next] = readEscape(expression, i + 1);
      value += decoded;
      i = next;
    } else {
      value += expression[i];
      i += 1;
    }
  }
  if (i >= expression.length) {
    throw new Error("Unterminated string literal");
  }
  return [value, i + 1];
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      const [value, next] = readString(expression, i);
      tokens.push({ type: "string", value });
      i = next;
      continue;
    }

    const previous = tokens.at(-1);
    const followsValue =
      previous !== undefined &&
      (previous.type !== "operator" ||
        previous.value === ")" ||
        previous.value === "]");
    const startsNumber =
      DIGIT.test(char) ||
      (char === "." && !followsValue && DIGIT.test(expression[i + 1] ?? ""));

    if (startsNumber) {
      const match = NUMBER_PATTERN.exec(expression.slice(i));
      const literal = match?.[0] ?? "";
      const next = expression[i + literal.length] ?? "";
      if (!literal || IDENTIFIER_PART.test(next) || next === ".") {
        throw new Error("Invalid number literal");
      }
      tokens.push({ type: "number", value: Number(literal) });
      i += literal.length;
      continue;
    }

    if (IDENTIFIER_START.test(char)) {
      let end = i;
      while (end < expression.length && IDENTIFIER_PART.test(expression[end])) {
        end += 1;
      }
      tokens.push({ type: "identifier", value: expression.slice(i, end) });
      i = end;
      continue;
    }

    const operator = OPERATORS.find((op) => expression.startsWith(op, i));
    if (!operator) {
      throw new Error(`Unexpected character "${char}"`);
    }
    tokens.push({ type: "operator", value: operator });
    i += operator.length;
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseConditional();
    if (this.position < this.tokens.length) {
      throw new Error("Unexpected token after end of expression");
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private isOperator(value: string): boolean {
    const token = this.peek();
    return token?.type === "operator" && token.value === value;
  }

  private expectOperator(value: string): void {
    if (!this.isOperator(value)) {
      throw new Error(`Expected "${value}"`);
    }
    this.position += 1;
  }

  private parseConditional(): Node {
    const test = this.parseBinary(0);
    if (!this.isOperator("?")) {
      return test;
    }
    this.position += 1;
    const consequent = this.parseConditional();
    this.expectOperator(":");
    const alternate = this.parseConditional();
    return { type: "conditional", test, consequent, alternate };
  }

  private parseBinary(minPrecedence: number): Node {
    let left = this.parseUnary();

    while (true) {
      const token = this.peek();
      if (token?.type !== "operator") {
        break;
      }
      const precedence = BINARY_PRECEDENCE[token.value];
      if (precedence === undefined || precedence <= minPrecedence) {
        break;
      }
      this.position += 1;
      const right = this.parseBinary(precedence);
      left = { type: "binary", operator: token.value, left, right };
    }

    return left;
  }

  private parseUnary(): Node {
    if (this.isOperator("!") || this.isOperator("-")) {
      const operator = (this.peek() as Token).value as string;
      this.position += 1;
      return { type: "unary", operator, argument: this.parseUnary() };
    }
    return this.parsePostfix(this.parsePrimary());
  }

  private parsePrimary(): Node {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of expression");
    }
    this.position += 1;

    if (token.type === "number" || token.type === "string") {
      return { type: "literal", value: token.value };
    }

    if (token.type === "identifier") {
      const literals: Record<string, unknown> = {
        true: true,
        false: false,
        null: null,
        undefined,
      };
      if (token.value in literals) {
        return { type: "literal", value: literals[token.value] };
      }
      if (VARIABLE_PATTERN.test(token.value)) {
        return { type: "variable", name: token.value };
      }
      throw new Error(`Unknown identifier "${token.value}"`);
    }

    if (token.value === "(") {
      const node = this.parseConditional();
      this.expectOperator(")");
      return node;
    }

    throw new Error(`Unexpected "${token.value}"`);
  }

  private parsePostfix(base: Node): Node {
    let node = base;

    while (true) {
      if (this.isOperator(".")) {
        this.position += 1;
        const name = this.peek();
        if (name?.type !== "identifier") {
          throw new Error("Expected property name after '.'");
        }
        this.position += 1;

        if (this.isOperator("(")) {
          this.position += 1;
          const args: Node[] = [];
          while (!this.isOperator(")")) {
            args.push(this.parseConditional());
            if (!this.isOperator(")")) {
              this.expectOperator(",");
            }
          }
          this.position += 1;
          if (!ALLOWED_METHODS.has(name.value)) {
            throw new Error(`Method "${name.value}" is not allowed`);
          }
          node = { type: "call", object: node, method: name.value, args };
        } else {
          if (BLOCKED_PROPERTIES.has(name.value)) {
            throw new Error(`Property "${name.value}" is not allowed`);
          }
          node = { type: "member", object: node, property: name.value };
        }
        continue;
      }

      if (this.isOperator("[")) {
        this.position += 1;
        const key = this.peek();
        if (key?.type !== "number" && key?.type !== "string") {
          throw new Error("Only numeric indices or string literals are allowed");
        }
        this.position += 1;
        this.expectOperator("]");
        node = { type: "member", object: node, property: String(key.value) };
        if (BLOCKED_PROPERTIES.has(String(key.value))) {
          throw new Error(`Property "${key.value}" is not allowed`);
        }
        continue;
      }

      return node;
    }
  }
}

function readProperty(object: unknown, property: string): unknown {
  if (BLOCKED_PROPERTIES.has(property)) {
    throw new Error(`Property "${property}" is not allowed`);
  }
  if (object === null || object === undefined) {
    return undefined;
  }
  if (typeof object === "string" || Array.isArray(object)) {
    if (property === "length") {
      return object.length;
    }
  }
  if (typeof object !== "object" && typeof object !== "string") {
    return undefined;
  }
  return Object.hasOwn(object as object, property)
    ? (object as Record<string, unknown>)[property]
    : undefined;
}

function callMethod(target: unknown, method: string, args: unknown[]): unknown {
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Method "${method}" is not allowed`);
  }
  if (method === "toString") {
    return String(target);
  }
  const position = args[1] === undefined ? undefined : Number(args[1]);
  if (method === "includes" && Array.isArray(target)) {
    return target.includes(args[0], position);
  }
  if (typeof target !== "string") {
    return undefined;
  }
  switch (method) {
    case "includes":
      return target.includes(String(args[0]), position);
    case "startsWith":
      return target.startsWith(String(args[0]), position);
    case "endsWith":
      return target.endsWith(String(args[0]), position);
    case "toLowerCase":
      return target.toLowerCase();
    case "toUpperCase":
      return target.toUpperCase();
    default:
      return target.trim();
  }
}

function evaluateBinary(operator: string, left: unknown, right: unknown): unknown {
  // biome-ignore lint/suspicious/noExplicitAny: operands are user data
  const l = left as any;
  // biome-ignore lint/suspicious/noExplicitAny: operands are user data
  const r = right as any;
  switch (operator) {
    case "===":
      return l === r;
    case "!==":
      return l !== r;
    case "==":
      // biome-ignore lint/suspicious/noDoubleEquals: preserves condition semantics
      return l == r;
    case "!=":
      // biome-ignore lint/suspicious/noDoubleEquals: preserves condition semantics
      return l != r;
    case ">":
      return l > r;
    case "<":
      return l < r;
    case ">=":
      return l >= r;
    case "<=":
      return l <= r;
    case "+":
      return l + r;
    case "-":
      return l - r;
    case "*":
      return l * r;
    case "/":
      return l / r;
    default:
      return l % r;
  }
}

function evaluateNode(node: Node, variables: Record<string, unknown>): unknown {
  switch (node.type) {
    case "literal":
      return node.value;
    case "variable":
      return variables[node.name];
    case "member":
      return readProperty(evaluateNode(node.object, variables), node.property);
    case "call":
      return callMethod(
        evaluateNode(node.object, variables),
        node.method,
        node.args.map((arg) => evaluateNode(arg, variables))
      );
    case "unary": {
      const value = evaluateNode(node.argument, variables);
      return node.operator === "!" ? !value : -(value as number);
    }
    case "conditional":
      return evaluateNode(node.test, variables)
        ? evaluateNode(node.consequent, variables)
        : evaluateNode(node.alternate, variables);
    default: {
      if (node.operator === "&&") {
        return (
          evaluateNode(node.left, variables) &&
          evaluateNode(node.right, variables)
        );
      }
      if (node.operator === "||") {
        return (
          evaluateNode(node.left, variables) ||
          evaluateNode(node.right, variables)
        );
      }
      return evaluateBinary(
        node.operator,
        evaluateNode(node.left, variables),
        evaluateNode(node.right, variables)
      );
    }
  }
}

/**
 * Evaluate a transformed condition expression against workflow variables.
 * Throws on any syntax outside the supported grammar.
 */
export function evaluateExpression(
  expression: string,
  variables: Record<string, unknown>
): unknown {
  const ast = new Parser(tokenize(expression)).parse();
  return evaluateNode(ast, variables);
}

/**
 * Check whether an expression fits the supported condition grammar
 */
export function isSupportedConditionExpression(expression: string): boolean {
  try {
    new Parser(tokenize(expression)).parse();
    return true;
  } catch {
    return false;
  }
}

/**
 * Emit JavaScript source for a supported condition, rebuilt from its tokens.
 * Each `__vN` variable is replaced with `variables[N]`; string and number
 * literals are re-encoded, so nothing from the original text is copied as-is.
 * Returns null when the expression is not supported.
 */
export function generateConditionSource(
  expression: string,
  variables: string[]
): string | null {
  let tokens: Token[];
  try {
    tokens = tokenize(expression);
    new Parser(tokens).parse();
  } catch {
    return null;
  }

  const parts: string[] = [];
  for (const [index, token] of tokens.entries()) {
    const previous = tokens[index - 1];
    const isProperty =
      previous?.type === "operator" && previous.value === ".";

    if (token.type === "string") {
      parts.push(JSON.stringify(token.value));
    } else if (token.type === "number") {
      parts.push(String(token.value));
    } else if (
      token.type === "identifier" &&
      !isProperty &&
      VARIABLE_PATTERN.test(token.value)
    ) {
      const variable = variables[Number(token.value.slice(3))];
      if (variable === undefined) {
        return null;
      }
      parts.push(variable);
    } else {
      parts.push(token.value);
    }
  }
  return joinTokens(tokens, parts);
}

const NO_SPACE_BEFORE = new Set([".", ")", "]", ","]);
const NO_SPACE_AFTER = new Set([".", "(", "[", "!"]);

// Join emitted tokens with spacing that keeps member access and calls tight
// and never merges two tokens into a different one (for example "- -")
function joinTokens(tokens: Token[], parts: string[]): string {
  let source = "";
  for (const [index, part] of parts.entries()) {
    const current = tokens[index];
    const previous = tokens[index - 1];
    const tight =
      previous === undefined ||
      (current.type === "operator" &&
        (NO_SPACE_BEFORE.has(current.value) ||
          current.value === "[" ||
          (current.value === "(" && previous.type === "identifier"))) ||
      (previous.type === "operator" && NO_SPACE_AFTER.has(previous.value));
    source += (tight ? "" : " ") + part;
  }
  return source;
}
