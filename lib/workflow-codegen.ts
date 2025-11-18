import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

type CodeGenOptions = {
  functionName?: string;
  parameters?: Array<{ name: string; type: string }>;
  returnType?: string;
};

type GeneratedCode = {
  code: string;
  functionName: string;
  imports: string[];
};

/**
 * Generate TypeScript code from workflow JSON with "use workflow" directive
 */
export function generateWorkflowCode(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: CodeGenOptions = {}
): GeneratedCode {
  const {
    functionName = "executeWorkflow",
    parameters = [{ name: "input", type: "Record<string, unknown>" }],
    returnType = "Promise<unknown>",
  } = options;

  // Track required imports
  const imports = new Set<string>();
  imports.add("// Workflow integrations");

  // Build a map of node connections
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgesBySource = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = edgesBySource.get(edge.source) || [];
    targets.push(edge.target);
    edgesBySource.set(edge.source, targets);
  }

  // Find trigger nodes (nodes with no incoming edges)
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const triggerNodes = nodes.filter(
    (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id)
  );

  // Generate code for each node
  const codeLines: string[] = [];
  const visited = new Set<string>();

  // Parameter declarations
  const paramDeclarations = parameters
    .map((p) => `${p.name}: ${p.type}`)
    .join(", ");

  // Start function
  codeLines.push(
    `export async function ${functionName}(${paramDeclarations}): ${returnType} {`
  );
  codeLines.push(`  "use workflow";`);
  codeLines.push("");

  // Helper functions to generate code for different action types
  function generateEmailActionCode(indent: string, varName: string): string[] {
    imports.add(
      "import { sendEmail, generateEmail } from './integrations/resend';"
    );
    return [
      `${indent}const ${varName} = await sendEmail({`,
      `${indent}  to: input.email as string,`,
      `${indent}  subject: input.subject as string || 'Notification',`,
      `${indent}  body: input.body as string || 'No content',`,
      `${indent}});`,
    ];
  }

  function generateTicketActionCode(indent: string, varName: string): string[] {
    imports.add("import { createTicket } from './integrations/linear';");
    return [
      `${indent}const ${varName} = await createTicket({`,
      `${indent}  title: input.title as string || 'New Ticket',`,
      `${indent}  description: input.description as string || '',`,
      `${indent}});`,
    ];
  }

  function generateDatabaseActionCode(
    indent: string,
    varName: string
  ): string[] {
    imports.add(
      "import { executeQuery, insertData, queryData } from './integrations/database';"
    );
    return [`${indent}const ${varName} = await queryData('your_table', {});`];
  }

  function generateHTTPActionCode(
    indent: string,
    varName: string,
    endpoint?: string
  ): string[] {
    imports.add("import { callApi } from './integrations/api';");
    return [
      `${indent}const ${varName} = await callApi({`,
      `${indent}  url: '${endpoint || "https://api.example.com/endpoint"}',`,
      `${indent}  method: 'POST',`,
      `${indent}  body: input,`,
      `${indent}});`,
    ];
  }

  function generateActionNodeCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const lines: string[] = [`${indent}// Action: ${node.data.label}`];

    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }

    const actionType = node.data.config?.actionType as string;
    const endpoint = node.data.config?.endpoint as string;

    if (
      actionType === "Send Email" ||
      node.data.label.toLowerCase().includes("email")
    ) {
      lines.push(...generateEmailActionCode(indent, varName));
    } else if (
      actionType === "Create Ticket" ||
      node.data.label.toLowerCase().includes("ticket")
    ) {
      lines.push(...generateTicketActionCode(indent, varName));
    } else if (
      actionType === "Database Query" ||
      node.data.label.toLowerCase().includes("database")
    ) {
      lines.push(...generateDatabaseActionCode(indent, varName));
    } else if (actionType === "HTTP Request" || endpoint) {
      lines.push(...generateHTTPActionCode(indent, varName, endpoint));
    } else {
      lines.push(
        `${indent}const ${varName} = { status: 'success', data: input };`
      );
    }

    return lines;
  }

  function generateConditionNodeCode(
    node: WorkflowNode,
    nodeId: string,
    indent: string
  ): string[] {
    const lines: string[] = [`${indent}// Condition: ${node.data.label}`];

    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }

    const condition = node.data.config?.condition as string;
    const nextNodes = edgesBySource.get(nodeId) || [];

    if (nextNodes.length > 0) {
      const trueNode = nextNodes[0];
      const falseNode = nextNodes[1];

      lines.push(`${indent}if (${condition || "true"}) {`);
      if (trueNode) {
        const trueNodeCode = generateNodeCode(trueNode, `${indent}  `);
        lines.push(...trueNodeCode);
      }

      if (falseNode) {
        lines.push(`${indent}} else {`);
        const falseNodeCode = generateNodeCode(falseNode, `${indent}  `);
        lines.push(...falseNodeCode);
      }

      lines.push(`${indent}}`);
    }

    return lines;
  }

  // Helper to generate trigger node code
  function generateTriggerCode(
    node: WorkflowNode,
    varName: string,
    indent: string
  ): string[] {
    const lines: string[] = [];
    lines.push(`${indent}// Trigger: ${node.data.label}`);
    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }
    lines.push(`${indent}const ${varName} = { triggered: true, data: input };`);
    return lines;
  }

  // Helper to generate transform node code (no longer used but kept for backward compatibility)
  function _generateTransformCode(
    node: WorkflowNode,
    varName: string,
    indent: string
  ): string[] {
    const lines: string[] = [];
    lines.push(`${indent}// Transform: ${node.data.label}`);
    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }
    const transformType = node.data.config?.transformType as string;
    lines.push(`${indent}// Transform type: ${transformType || "Map Data"}`);
    lines.push(`${indent}const ${varName} = {`);
    lines.push(`${indent}  ...input,`);
    lines.push(`${indent}  transformed: true,`);
    lines.push(`${indent}  timestamp: Date.now(),`);
    lines.push(`${indent}};`);
    return lines;
  }

  // Generate code for each node in the workflow
  function generateNodeCode(nodeId: string, indent = "  "): string[] {
    if (visited.has(nodeId)) {
      return [`${indent}// Already processed: ${nodeId}`];
    }

    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    const lines: string[] = [];
    const varName = `${node.data.type}_${nodeId.replace(/-/g, "_")}`;

    switch (node.data.type) {
      case "trigger":
        lines.push(...generateTriggerCode(node, varName, indent));
        break;

      case "action": {
        const actionType = node.data.config?.actionType as string;
        // Handle condition as an action type
        if (actionType === "Condition") {
          lines.push(...generateConditionNodeCode(node, nodeId, indent));
          return lines;
        }
        lines.push(...generateActionNodeCode(node, indent, varName));
        break;
      }

      default:
        lines.push(`${indent}// Unknown node type: ${node.data.type}`);
        break;
    }

    lines.push("");

    // Process next nodes (conditions return early above)
    const nextNodes = edgesBySource.get(nodeId) || [];
    for (const nextNodeId of nextNodes) {
      const nextCode = generateNodeCode(nextNodeId, indent);
      lines.push(...nextCode);
    }

    return lines;
  }

  // Generate code starting from trigger nodes
  if (triggerNodes.length === 0) {
    codeLines.push("  // No trigger nodes found");
    codeLines.push(`  return { status: 'error', error: 'No trigger nodes' };`);
  } else {
    for (const trigger of triggerNodes) {
      const triggerCode = generateNodeCode(trigger.id, "  ");
      codeLines.push(...triggerCode);
    }

    // Return the last result
    const lastNode = nodes.at(-1);
    if (lastNode) {
      const lastVarName = `${lastNode.data.type}_${lastNode.id.replace(/-/g, "_")}`;
      codeLines.push(`  return ${lastVarName};`);
    }
  }

  codeLines.push("}");

  // Build final code
  const importStatements = Array.from(imports).join("\n");
  const code = `${importStatements}\n\n${codeLines.join("\n")}\n`;

  return {
    code,
    functionName,
    imports: Array.from(imports),
  };
}

/**
 * Generate a complete workflow module file
 */
export function generateWorkflowModule(
  workflowName: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: CodeGenOptions = {}
): string {
  const { code } = generateWorkflowCode(nodes, edges, options);

  return `/**
 * Generated Workflow: ${workflowName}
 * 
 * This file was automatically generated from a workflow definition.
 * DO NOT EDIT MANUALLY - regenerate from the workflow editor instead.
 */

${code}
`;
}
