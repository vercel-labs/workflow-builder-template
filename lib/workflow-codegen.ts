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

  function generateAiTextActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    imports.add("import { generateText } from './integrations/ai';");
    const aiPrompt =
      (node.data.config?.aiPrompt as string) || "Generate a summary";
    const aiModel = (node.data.config?.aiModel as string) || "gpt-4o-mini";
    const aiFormat = (node.data.config?.aiFormat as string) || "text";

    const lines = [
      `${indent}// Generate text using AI`,
      `${indent}const ${varName} = await generateText({`,
      `${indent}  model: "${aiModel}",`,
      `${indent}  prompt: \`${aiPrompt}\`,`,
    ];

    if (aiFormat === "object") {
      lines.push(`${indent}  format: "object",`);
    }

    lines.push(`${indent}});`);
    return lines;
  }

  function generateAiImageActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    imports.add("import { generateImage } from './integrations/ai';");
    const imagePrompt =
      (node.data.config?.imagePrompt as string) || "A beautiful landscape";
    const imageModel =
      (node.data.config?.imageModel as string) || "openai/dall-e-3";

    return [
      `${indent}// Generate image using AI`,
      `${indent}const ${varName} = await generateImage({`,
      `${indent}  model: "${imageModel}",`,
      `${indent}  prompt: \`${imagePrompt}\`,`,
      `${indent}});`,
    ];
  }

  function generateSlackActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    imports.add("import { sendSlackMessage } from './integrations/slack';");
    const slackChannel =
      (node.data.config?.slackChannel as string) || "#general";
    const slackMessage =
      (node.data.config?.slackMessage as string) || "Message content";

    return [
      `${indent}const ${varName} = await sendSlackMessage({`,
      `${indent}  channel: "${slackChannel}",`,
      `${indent}  text: "${slackMessage}",`,
      `${indent}});`,
    ];
  }

  function generateExecuteCodeActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    imports.add("import { executeCode } from './integrations/code';");
    const code =
      (node.data.config?.code as string) || "return { result: 'success' }";
    const codeLanguage =
      (node.data.config?.codeLanguage as string) || "javascript";

    return [
      `${indent}// Execute ${codeLanguage} code`,
      `${indent}const ${varName} = await executeCode({`,
      `${indent}  language: "${codeLanguage}",`,
      `${indent}  code: \`${code}\`,`,
      `${indent}});`,
    ];
  }

  function generateLinearActionCode(indent: string, varName: string): string[] {
    imports.add("import { createLinearIssue } from './integrations/linear';");
    return [
      `${indent}const ${varName} = await createLinearIssue({`,
      `${indent}  title: "Issue title",`,
      `${indent}  description: "Issue description",`,
      `${indent}});`,
    ];
  }

  function generateFindIssuesActionCode(
    indent: string,
    varName: string
  ): string[] {
    imports.add("import { findIssues } from './integrations/linear';");
    return [
      `${indent}const ${varName} = await findIssues({`,
      `${indent}  assigneeId: "user-id",`,
      `${indent}  status: "in_progress",`,
      `${indent}});`,
    ];
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Action type routing requires many conditionals
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
    const label = node.data.label.toLowerCase();

    if (actionType === "Send Email" || label.includes("email")) {
      lines.push(...generateEmailActionCode(indent, varName));
    } else if (
      actionType === "Create Linear Issue" ||
      actionType === "linear" ||
      label.includes("linear")
    ) {
      lines.push(...generateLinearActionCode(indent, varName));
    } else if (
      actionType === "Send Slack Message" ||
      actionType === "slack" ||
      label.includes("slack")
    ) {
      lines.push(...generateSlackActionCode(node, indent, varName));
    } else if (actionType === "Database Query" || label.includes("database")) {
      lines.push(...generateDatabaseActionCode(indent, varName));
    } else if (
      actionType === "Generate Text" ||
      label.includes("generate text")
    ) {
      lines.push(...generateAiTextActionCode(node, indent, varName));
    } else if (
      actionType === "Generate Image" ||
      label.includes("generate image")
    ) {
      lines.push(...generateAiImageActionCode(node, indent, varName));
    } else if (
      actionType === "Execute Code" ||
      label.includes("execute code")
    ) {
      lines.push(...generateExecuteCodeActionCode(node, indent, varName));
    } else if (actionType === "Create Ticket" || label.includes("ticket")) {
      lines.push(...generateTicketActionCode(indent, varName));
    } else if (actionType === "Find Issues" || label.includes("find issues")) {
      lines.push(...generateFindIssuesActionCode(indent, varName));
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
