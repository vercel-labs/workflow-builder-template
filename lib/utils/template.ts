/**
 * Template processing utilities for workflow node outputs
 * Supports syntax like {{nodeName.field}} or {{nodeName.nested.field}}
 * New format: {{@nodeId:DisplayName.field}} for ID-based references with display names
 */

// Regex constants for performance
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;
const ARRAY_ACCESS_PATTERN = /^([^[]+)\[(\d+)\]$/;

export type NodeOutputs = {
  [nodeId: string]: {
    label: string;
    data: unknown;
  };
};

// Helper function to process new format references (@nodeId:DisplayName)
function processNewFormatReference(
  trimmed: string,
  nodeOutputs: NodeOutputs,
  match: string
): string {
  const withoutAt = trimmed.substring(1);
  const colonIndex = withoutAt.indexOf(":");

  if (colonIndex === -1) {
    return match;
  }

  const nodeId = withoutAt.substring(0, colonIndex);
  const rest = withoutAt.substring(colonIndex + 1);
  const dotIndex = rest.indexOf(".");
  const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

  if (!fieldPath) {
    const nodeOutput = nodeOutputs[nodeId];
    if (nodeOutput) {
      return formatValue(nodeOutput.data);
    }
    return match;
  }

  const value = resolveFieldPath(nodeOutputs[nodeId]?.data, fieldPath);
  if (value !== undefined && value !== null) {
    return formatValue(value);
  }

  return match;
}

// Helper function to process legacy $ references ($nodeId)
function processLegacyDollarReference(
  trimmed: string,
  nodeOutputs: NodeOutputs,
  match: string
): string {
  const withoutDollar = trimmed.substring(1);

  if (!(withoutDollar.includes(".") || withoutDollar.includes("["))) {
    const nodeOutput = nodeOutputs[withoutDollar];
    if (nodeOutput) {
      return formatValue(nodeOutput.data);
    }
    return match;
  }

  const value = resolveExpressionById(withoutDollar, nodeOutputs);
  if (value !== undefined && value !== null) {
    return formatValue(value);
  }

  return match;
}

// Helper function to process legacy label references
function processLegacyLabelReference(
  trimmed: string,
  nodeOutputs: NodeOutputs,
  match: string
): string {
  if (!(trimmed.includes(".") || trimmed.includes("["))) {
    const nodeOutput = findNodeOutputByLabel(trimmed, nodeOutputs);
    if (nodeOutput) {
      return formatValue(nodeOutput.data);
    }
    return match;
  }

  const value = resolveExpression(trimmed, nodeOutputs);
  if (value !== undefined && value !== null) {
    return formatValue(value);
  }

  return match;
}

/**
 * Replace template variables in a string with actual values from node outputs
 * Supports:
 * - Node ID references with display: {{@nodeId:DisplayName.field}} or {{@nodeId:DisplayName}}
 * - Node ID references: {{$nodeId.field}} or {{$nodeId}} (legacy)
 * - Label references: {{nodeName.field}} or {{nodeName}} (legacy)
 * - Nested fields: {{$nodeId.nested.field}}
 * - Array access: {{$nodeId.items[0]}}
 */
export function processTemplate(
  template: string,
  nodeOutputs: NodeOutputs
): string {
  if (!template || typeof template !== "string") {
    return template;
  }

  return template.replace(TEMPLATE_PATTERN, (match, expression) => {
    const trimmed = expression.trim();

    let result: string;
    if (trimmed.startsWith("@")) {
      result = processNewFormatReference(trimmed, nodeOutputs, match);
    } else if (trimmed.startsWith("$")) {
      result = processLegacyDollarReference(trimmed, nodeOutputs, match);
    } else {
      result = processLegacyLabelReference(trimmed, nodeOutputs, match);
    }

    return result;
  });
}

/**
 * Process all template strings in a configuration object
 */
export function processConfigTemplates(
  config: Record<string, unknown>,
  nodeOutputs: NodeOutputs
): Record<string, unknown> {
  const processed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      processed[key] = processTemplate(value, nodeOutputs);
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      processed[key] = processConfigTemplates(
        value as Record<string, unknown>,
        nodeOutputs
      );
    } else {
      processed[key] = value;
    }
  }

  return processed;
}

/**
 * Resolve a field path in data like "field.nested" or "items[0]"
 */
function resolveFieldPath(data: unknown, fieldPath: string): unknown {
  if (!data) {
    return;
  }

  const parts = fieldPath.split(".");
  let current: unknown = data;

  for (const part of parts) {
    const trimmedPart = part.trim();

    if (!trimmedPart) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = trimmedPart.match(ARRAY_ACCESS_PATTERN);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      const fieldValue = (current as Record<string, unknown>)?.[field];
      if (Array.isArray(fieldValue)) {
        current = fieldValue[Number.parseInt(index, 10)];
      } else {
        current = undefined;
      }
    } else if (Array.isArray(current)) {
      // If current is an array and we're trying to access a field,
      // map over the array and extract that field from each element
      current = current.map((item) => item?.[trimmedPart]);
    } else {
      current = (current as Record<string, unknown>)?.[trimmedPart];
    }

    if (current === undefined || current === null) {
      return;
    }
  }

  return current;
}

/**
 * Find a node output by label (case-insensitive)
 */
function findNodeOutputByLabel(
  label: string,
  nodeOutputs: NodeOutputs
): { label: string; data: unknown } | undefined {
  const normalizedLabel = label.toLowerCase().trim();

  for (const output of Object.values(nodeOutputs)) {
    if (output.label.toLowerCase().trim() === normalizedLabel) {
      return output;
    }
  }

  return;
}

/**
 * Resolve a dotted/bracketed expression using node ID like "nodeId.field.nested" or "nodeId.items[0]"
 */
function resolveExpressionById(
  expression: string,
  nodeOutputs: NodeOutputs
): unknown {
  // Split by dots, but handle array brackets
  const parts = expression.split(".");

  if (parts.length === 0) {
    return;
  }

  // First part is the node ID
  const nodeId = parts[0].trim();
  const nodeOutput = nodeOutputs[nodeId];

  if (!nodeOutput) {
    return;
  }

  // Start with the node's data
  let current: unknown = nodeOutput.data;

  // Navigate through remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();

    if (!part) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = part.match(ARRAY_ACCESS_PATTERN);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      const fieldValue = (current as Record<string, unknown>)?.[field];
      if (Array.isArray(fieldValue)) {
        current = fieldValue[Number.parseInt(index, 10)];
      } else {
        current = undefined;
      }
    } else if (Array.isArray(current)) {
      // If current is an array and we're trying to access a field,
      // map over the array and extract that field from each element
      current = current.map(
        (item) => (item as Record<string, unknown>)?.[part]
      );
    } else {
      current = (current as Record<string, unknown>)?.[part];
    }

    if (current === undefined || current === null) {
      return;
    }
  }

  return current;
}

/**
 * Resolve a dotted/bracketed expression like "nodeName.field.nested" or "nodeName.items[0]"
 */
function resolveExpression(
  expression: string,
  nodeOutputs: NodeOutputs
): unknown {
  // Split by dots, but handle array brackets
  const parts = expression.split(".");

  if (parts.length === 0) {
    return;
  }

  // First part is the node label
  const nodeLabel = parts[0].trim();
  const nodeOutput = findNodeOutputByLabel(nodeLabel, nodeOutputs);

  if (!nodeOutput) {
    return;
  }

  // Start with the node's data
  let current: unknown = nodeOutput.data;

  // Navigate through remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();

    if (!part) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = part.match(ARRAY_ACCESS_PATTERN);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      const fieldValue = (current as Record<string, unknown>)?.[field];
      if (Array.isArray(fieldValue)) {
        current = fieldValue[Number.parseInt(index, 10)];
      } else {
        current = undefined;
      }
    } else if (Array.isArray(current)) {
      // If current is an array and we're trying to access a field,
      // map over the array and extract that field from each element
      current = current.map(
        (item) => (item as Record<string, unknown>)?.[part]
      );
    } else {
      current = (current as Record<string, unknown>)?.[part];
    }

    if (current === undefined || current === null) {
      return;
    }
  }

  return current;
}

/**
 * Format a value for string interpolation
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    // Format arrays as comma-separated values
    return value.map(formatValue).join(", ");
  }

  if (typeof value === "object") {
    // For objects, try to find a meaningful representation
    const obj = value as Record<string, unknown>;

    // Common fields to check for meaningful representation
    if (obj.title) {
      return String(obj.title);
    }
    if (obj.name) {
      return String(obj.name);
    }
    if (obj.id) {
      return String(obj.id);
    }
    if (obj.message) {
      return String(obj.message);
    }

    // Otherwise return JSON
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Format templates for display in inputs
 * Converts {{@nodeId:DisplayName.field}} to just show DisplayName.field
 */
export function formatTemplateForDisplay(template: string): string {
  if (!template || typeof template !== "string") {
    return template;
  }

  // Match {{@nodeId:DisplayName...}} patterns and show only DisplayName part
  return template.replace(
    /\{\{@[^:]+:([^}]+)\}\}/g,
    (_match, rest) => `{{${rest}}}`
  );
}

/**
 * Check if a string contains template variables
 */
export function hasTemplateVariables(str: string): boolean {
  return /\{\{[^}]+\}\}/g.test(str);
}
export function extractTemplateVariables(template: string): string[] {
  if (!template || typeof template !== "string") {
    return [];
  }

  const pattern = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];

  for (const match of template.matchAll(pattern)) {
    variables.push(match[1].trim());
  }

  return variables;
}

/**
 * Get all available fields from node outputs for autocomplete/suggestions
 */
export function getAvailableFields(nodeOutputs: NodeOutputs): Array<{
  nodeLabel: string;
  field: string;
  path: string;
  sample?: unknown;
}> {
  const fields: Array<{
    nodeLabel: string;
    field: string;
    path: string;
    sample?: unknown;
  }> = [];

  for (const output of Object.values(nodeOutputs)) {
    // Add the whole node
    fields.push({
      nodeLabel: output.label,
      field: "",
      path: `{{${output.label}}}`,
      sample: output.data,
    });

    // Add individual fields if data is an object
    if (output.data && typeof output.data === "object") {
      extractFields(output.data, output.label, fields, {
        currentPath: `{{${output.label}`,
      });
    }
  }

  return fields;
}

/**
 * Recursively extract fields from an object
 */
function extractFields(
  obj: Record<string, unknown> | unknown,
  nodeLabel: string,
  fields: Array<{
    nodeLabel: string;
    field: string;
    path: string;
    sample?: unknown;
  }>,
  options: {
    currentPath: string;
    maxDepth?: number;
    currentDepth?: number;
  }
): void {
  const { currentPath, maxDepth = 3, currentDepth = 0 } = options;

  if (currentDepth >= maxDepth || !obj || typeof obj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fieldPath = `${currentPath}.${key}}}`;

    fields.push({
      nodeLabel,
      field: key,
      path: fieldPath,
      sample: value,
    });

    // Recurse for nested objects (but not arrays)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      extractFields(value, nodeLabel, fields, {
        currentPath: `${currentPath}.${key}`,
        maxDepth,
        currentDepth: currentDepth + 1,
      });
    }
  }
}
