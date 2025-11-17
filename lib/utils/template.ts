/**
 * Template processing utilities for workflow node outputs
 * Supports syntax like {{nodeName.field}} or {{nodeName.nested.field}}
 * New format: {{@nodeId:DisplayName.field}} for ID-based references with display names
 */

export type NodeOutputs = {
  [nodeId: string]: {
    label: string;
    data: unknown;
  };
};

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

  // Match {{...}} patterns
  const pattern = /\{\{([^}]+)\}\}/g;

  return template.replace(pattern, (match, expression) => {
    const trimmed = expression.trim();

    // Check if this is a new format ID reference (starts with @)
    const isNewFormat = trimmed.startsWith("@");

    if (isNewFormat) {
      // Format: @nodeId:DisplayName or @nodeId:DisplayName.field
      const withoutAt = trimmed.substring(1);
      const colonIndex = withoutAt.indexOf(":");

      if (colonIndex === -1) {
        console.warn(
          `[Template] Invalid format: "${trimmed}". Expected @nodeId:DisplayName`
        );
        return match;
      }

      const nodeId = withoutAt.substring(0, colonIndex);
      const rest = withoutAt.substring(colonIndex + 1);

      // Check if there's a field accessor after the display name
      const dotIndex = rest.indexOf(".");
      const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

      // Handle special case: {{@nodeId:DisplayName}} (entire output)
      if (!fieldPath) {
        const nodeOutput = nodeOutputs[nodeId];
        if (nodeOutput) {
          return formatValue(nodeOutput.data);
        }
        console.warn(
          `[Template] Node with ID "${nodeId}" not found in outputs`
        );
        return match;
      }

      // Parse field expression like "field.nested" or "items[0]"
      const value = resolveFieldPath(nodeOutputs[nodeId]?.data, fieldPath);
      if (value !== undefined && value !== null) {
        return formatValue(value);
      }
    }
    // Check if this is a legacy node ID reference (starts with $)
    else if (trimmed.startsWith("$")) {
      const withoutDollar = trimmed.substring(1);

      // Handle special case: {{$nodeId}} (entire output)
      if (!(withoutDollar.includes(".") || withoutDollar.includes("["))) {
        const nodeOutput = nodeOutputs[withoutDollar];
        if (nodeOutput) {
          return formatValue(nodeOutput.data);
        }
        console.warn(
          `[Template] Node with ID "${withoutDollar}" not found in outputs`
        );
        return match;
      }

      // Parse expression like "$nodeId.field.nested" or "$nodeId.items[0]"
      const value = resolveExpressionById(withoutDollar, nodeOutputs);
      if (value !== undefined && value !== null) {
        return formatValue(value);
      }
    } else {
      // Legacy label-based references
      // Handle special case: {{nodeName}} (entire output)
      if (!(trimmed.includes(".") || trimmed.includes("["))) {
        const nodeOutput = findNodeOutputByLabel(trimmed, nodeOutputs);
        if (nodeOutput) {
          return formatValue(nodeOutput.data);
        }
        console.warn(`[Template] Node "${trimmed}" not found in outputs`);
        return match;
      }

      // Parse expression like "nodeName.field.nested" or "nodeName.items[0]"
      const value = resolveExpression(trimmed, nodeOutputs);
      if (value !== undefined && value !== null) {
        return formatValue(value);
      }
    }

    // Log warning for debugging
    console.warn(`[Template] Could not resolve "${trimmed}" in node outputs`);

    // Return original template if value not found
    return match;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = data;

  for (const part of parts) {
    const trimmedPart = part.trim();

    if (!trimmedPart) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = trimmedPart.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      current = current?.[field]?.[Number.parseInt(index, 10)];
    } else {
      current = current?.[trimmedPart];
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
    console.warn(`[Template] Node with ID "${nodeId}" not found in outputs`);
    return;
  }

  // Start with the node's data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = nodeOutput.data;

  console.log(
    `[Template] Resolving "${expression}". Node data:`,
    JSON.stringify(current, null, 2)
  );

  // Navigate through remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();

    if (!part) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      current = current?.[field]?.[Number.parseInt(index, 10)];
    } else {
      current = current?.[part];
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
    console.warn(
      `[Template] Node "${nodeLabel}" not found. Available nodes:`,
      Object.values(nodeOutputs).map((n) => n.label)
    );
    return;
  }

  // Start with the node's data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = nodeOutput.data;

  console.log(
    `[Template] Resolving "${expression}". Node data:`,
    JSON.stringify(current, null, 2)
  );

  // Navigate through remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();

    if (!part) {
      continue;
    }

    // Handle array access like "items[0]"
    const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;
      current = current?.[field]?.[Number.parseInt(index, 10)];
    } else {
      current = current?.[part];
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = value as any;

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
    (match, rest) => `{{${rest}}}`
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
  let match;

  while ((match = pattern.exec(template)) !== null) {
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
      extractFields(output.data, output.label, fields, `{{${output.label}}`);
    }
  }

  return fields;
}

/**
 * Recursively extract fields from an object
 */
function extractFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  nodeLabel: string,
  fields: Array<{
    nodeLabel: string;
    field: string;
    path: string;
    sample?: unknown;
  }>,
  currentPath: string,
  maxDepth = 3,
  currentDepth = 0
): void {
  if (currentDepth >= maxDepth || !obj || typeof obj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = `${currentPath}.${key}}}`;

    fields.push({
      nodeLabel,
      field: key,
      path: fieldPath,
      sample: value,
    });

    // Recurse for nested objects (but not arrays)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      extractFields(
        value,
        nodeLabel,
        fields,
        `${currentPath}.${key}`,
        maxDepth,
        currentDepth + 1
      );
    }
  }
}
