import { findActionById } from "@/plugins";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

// Regex patterns at top level for performance
export const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;
export const WHITESPACE_PATTERN = /\s+/;
export const NON_ALPHANUMERIC_PATTERN = /[^a-zA-Z0-9]/g;
export const ARRAY_INDEX_PATTERN = /^([^[]+)\[(\d+)\]$/;
export const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
export const NUMBER_START_PATTERN = /^[0-9]/;

/**
 * Helper to find all node references in templates
 */
export function findNodeReferences(template: string): Set<string> {
  const refs = new Set<string>();
  if (!template || typeof template !== "string") {
    return refs;
  }

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: pattern.exec() is the standard way to iterate regex matches
  while ((match = TEMPLATE_PATTERN.exec(template)) !== null) {
    const expression = match[1].trim();

    // Handle @nodeId:DisplayName.field format
    if (expression.startsWith("@")) {
      const withoutAt = expression.substring(1);
      const colonIndex = withoutAt.indexOf(":");
      if (colonIndex !== -1) {
        const nodeId = withoutAt.substring(0, colonIndex);
        refs.add(nodeId);
      }
    }
    // Handle $nodeId.field format
    else if (expression.startsWith("$")) {
      const withoutDollar = expression.substring(1);
      const parts = withoutDollar.split(".");
      if (parts.length > 0) {
        refs.add(parts[0]);
      }
    }
  }

  return refs;
}

/**
 * Helper to extract node references from a config value
 */
export function extractRefsFromConfigValue(value: unknown): Set<string> {
  const refs = new Set<string>();
  if (typeof value === "string") {
    const foundRefs = findNodeReferences(value);
    for (const ref of foundRefs) {
      refs.add(ref);
    }
  }
  return refs;
}

/**
 * Helper to analyze which node outputs are used
 */
export function analyzeNodeUsage(nodes: WorkflowNode[]): Set<string> {
  const usedNodes = new Set<string>();

  for (const node of nodes) {
    if (node.data.type !== "action") {
      continue;
    }

    const config = node.data.config || {};
    for (const value of Object.values(config)) {
      const refs = extractRefsFromConfigValue(value);
      for (const ref of refs) {
        usedNodes.add(ref);
      }
    }
  }

  return usedNodes;
}

/**
 * Build a map of node connections
 */
export function buildEdgeMap(edges: WorkflowEdge[]): Map<string, string[]> {
  const edgesBySource = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = edgesBySource.get(edge.source) || [];
    targets.push(edge.target);
    edgesBySource.set(edge.source, targets);
  }
  return edgesBySource;
}

/**
 * Find trigger nodes (nodes with no incoming edges)
 */
export function findTriggerNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter(
    (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id)
  );
}

/**
 * Helper to build access path from field path
 */
export function buildAccessPath(fieldPath: string): string {
  return fieldPath
    .split(".")
    .map((part: string) => {
      const arrayMatch = ARRAY_INDEX_PATTERN.exec(part);
      if (arrayMatch) {
        return `.${arrayMatch[1]}[${arrayMatch[2]}]`;
      }
      return `.${part}`;
    })
    .join("");
}

/**
 * Helper to convert label or action type to a friendly variable name
 */
export function toFriendlyVarName(label: string, actionType?: string): string {
  // Use label if available, otherwise fall back to action type
  const baseName = label || actionType || "result";

  // Convert to camelCase: "Generate Friendly Greeting Email" -> "generateFriendlyGreetingEmail"
  const camelCase = baseName
    .split(WHITESPACE_PATTERN)
    .map((word, index) => {
      const cleaned = word.replace(NON_ALPHANUMERIC_PATTERN, "");
      if (!cleaned) {
        return "";
      }
      if (index === 0) {
        return cleaned.toLowerCase();
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    })
    .filter((word) => word.length > 0)
    .join("");

  // Add "Result" suffix
  return `${camelCase}Result`;
}

/**
 * Helper to remove invisible characters (non-breaking spaces, etc.)
 */
export function removeInvisibleChars(str: string): string {
  // Replace non-breaking space (U+00a0) and other invisible spaces with regular space
  return str
    .replace(/\u00a0/g, " ") // Non-breaking space
    .replace(/[\u2000-\u200B\u2028\u2029]/g, " "); // Various invisible space characters
}

/**
 * Escape a string for safe use in template literals
 * Only escapes backslashes and backticks
 */
export function escapeForTemplateLiteral(str: string): string {
  if (!str) {
    return "";
  }
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/`/g, "\\`"); // Escape backticks
}

/**
 * Sanitize a function name
 */
export function sanitizeFunctionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(NUMBER_START_PATTERN, "_$&")
    .replace(/_+/g, "_");
}

/**
 * Sanitize a step name (creates camelCase + Step suffix)
 */
export function sanitizeStepName(name: string): string {
  // Create a more readable function name from the label
  // e.g., "Find Issues" -> "findIssuesStep", "Generate Email Text" -> "generateEmailTextStep"
  const result = name
    .split(WHITESPACE_PATTERN) // Split by whitespace
    .filter((word) => word.length > 0) // Remove empty strings
    .map((word, index) => {
      // Remove non-alphanumeric characters
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, "");
      if (!cleaned) {
        return "";
      }

      // Capitalize first letter of each word except the first
      if (index === 0) {
        return cleaned.toLowerCase();
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    })
    .filter((word) => word.length > 0) // Remove empty results
    .join("");

  // Ensure we have a valid identifier
  if (!result || result.length === 0) {
    return "unnamedStep";
  }

  // Prefix with underscore if starts with number
  const sanitized = result.replace(NUMBER_START_PATTERN, "_$&");

  // Add "Step" suffix to avoid conflicts with imports (e.g., generateText from 'ai')
  return `${sanitized}Step`;
}

/**
 * Sanitize a variable name
 */
export function sanitizeVarName(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Helper to convert a JavaScript value to TypeScript object literal syntax
 */
export function toTypeScriptLiteral(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => toTypeScriptLiteral(item));
    return `[${items.join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).map(([key, val]) => {
      // Use quoted key only if it's not a valid identifier
      const keyStr = VALID_IDENTIFIER_PATTERN.test(key)
        ? key
        : JSON.stringify(key);
      return `${keyStr}: ${toTypeScriptLiteral(val)}`;
    });
    return `{${entries.join(", ")}}`;
  }
  return String(value);
}

/**
 * Helper to process AI schema and convert to TypeScript literal
 */
export function processAiSchema(aiSchema: string | undefined): string | null {
  if (!aiSchema) {
    return null;
  }

  try {
    const parsedSchema = JSON.parse(aiSchema);
    // Remove id field from each schema object
    const schemaWithoutIds = Array.isArray(parsedSchema)
      ? parsedSchema.map((field: Record<string, unknown>) => {
          const { id: _id, ...rest } = field;
          return rest;
        })
      : parsedSchema;
    return toTypeScriptLiteral(schemaWithoutIds);
  } catch {
    // If schema is invalid JSON, skip it
    return null;
  }
}

// System actions that don't have plugins (step info for generated code)
const SYSTEM_STEP_INFO: Record<
  string,
  { functionName: string; importPath: string }
> = {
  "Database Query": {
    functionName: "databaseQueryStep",
    importPath: "./steps/database-query-step",
  },
  "HTTP Request": {
    functionName: "httpRequestStep",
    importPath: "./steps/http-request-step",
  },
  Condition: {
    functionName: "conditionStep",
    importPath: "./steps/condition-step",
  },
};

/**
 * Helper to convert action type to step function name and import path
 * Uses plugin registry for plugin actions, hardcoded map for system actions
 */
export function getStepInfo(actionType: string): {
  functionName: string;
  importPath: string;
} {
  // Check system actions first
  const systemInfo = SYSTEM_STEP_INFO[actionType];
  if (systemInfo) {
    return systemInfo;
  }

  // Look up in plugin registry
  const action = findActionById(actionType);
  if (action) {
    return {
      functionName: action.stepFunction,
      // Convert plugin's stepImportPath to generated code import path
      // Plugin uses "send-email", generated code uses "./steps/send-email-step"
      importPath: `./steps/${action.stepImportPath}-step`,
    };
  }

  // Fallback for unknown actions
  return {
    functionName: "unknownStep",
    importPath: "./steps/unknown-step",
  };
}
