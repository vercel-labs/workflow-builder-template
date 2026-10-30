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

function readString(expression: string, start: number): [string, number] {
  const quote = expression[start];
  let value = "";
  let i = start + 1;
  while (i < expression.length && expression[i] !== quote) {
    if (expression[i] === "\\" && i + 1 < expression.length) {
      const next = expression[i + 1];
      const escapes: Record<string, string> = { n: "\n", t: "\t", r: "\r" };
      value += escapes[next] ?? next;
      i += 2;
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

    if (DIGIT.test(char)) {
      let end = i;
      while (end < expression.length && /[\d.]/.test(expression[end])) {
        end += 1;
      }
      tokens.push({ type: "number", value: Number(expression.slice(i, end)) });
      i = end;
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
          node = { type: "call", object: node, method: name.value, args };
        } else {
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
  if (method === "includes" && Array.isArray(target)) {
    return target.includes(args[0]);
  }
  if (typeof target !== "string") {
    return undefined;
  }
  switch (method) {
    case "includes":
      return target.includes(String(args[0]));
    case "startsWith":
      return target.startsWith(String(args[0]));
    case "endsWith":
      return target.endsWith(String(args[0]));
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
