import {
  analyzeNodeUsage,
  buildAccessPath,
  getStepInfo,
  removeInvisibleChars,
  TEMPLATE_PATTERN,
  toFriendlyVarName,
  toTypeScriptLiteral,
} from "./workflow-codegen-shared";
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

// Local constants not shared
const CONST_ASSIGNMENT_PATTERN = /^(\s*)(const\s+\w+\s*=\s*)(.*)$/;

/**
 * Generate TypeScript code from workflow JSON with "use workflow" directive
 */
export function generateWorkflowCode(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: CodeGenOptions = {}
): GeneratedCode {
  const { functionName = "executeWorkflow" } = options;

  // Analyze which node outputs are actually used
  const usedNodeOutputs = analyzeNodeUsage(nodes);

  // Track required imports
  const imports = new Set<string>();

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

  // Start function
  codeLines.push(`export async function ${functionName}() {`);
  codeLines.push(`  "use workflow";`);
  codeLines.push("");

  // Build a map of nodeId to variable name for template references
  const nodeIdToVarName = new Map<string, string>();
  const usedVarNames = new Set<string>();

  for (const node of nodes) {
    let varName: string;

    if (node.data.type === "action") {
      const actionType = node.data.config?.actionType as string | undefined;
      const label = node.data.label || "";
      const baseVarName = toFriendlyVarName(label, actionType);

      // Ensure uniqueness
      varName = baseVarName;
      let counter = 1;
      while (usedVarNames.has(varName)) {
        varName = `${baseVarName}${counter}`;
        counter += 1;
      }
      usedVarNames.add(varName);
    } else {
      // For triggers, use a simple name
      varName = `${node.data.type}_${node.id.replace(/-/g, "_")}`;
    }

    nodeIdToVarName.set(node.id, varName);
  }

  // Helper to process @nodeId:DisplayName.field format for template strings
  function processAtFormat(trimmed: string, match: string): string {
    const withoutAt = trimmed.substring(1);
    const colonIndex = withoutAt.indexOf(":");
    if (colonIndex === -1) {
      return match;
    }

    const nodeId = withoutAt.substring(0, colonIndex);
    const rest = withoutAt.substring(colonIndex + 1);
    const dotIndex = rest.indexOf(".");
    const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

    const varName = nodeIdToVarName.get(nodeId);
    if (!varName) {
      return match; // Node not found, keep original
    }

    if (!fieldPath) {
      return `\${${varName}}`;
    }

    const accessPath = buildAccessPath(fieldPath);
    return `\${${varName}${accessPath}}`;
  }

  // Helper to process $nodeId.field format for template strings
  function processDollarFormat(trimmed: string, match: string): string {
    const withoutDollar = trimmed.substring(1);
    const parts = withoutDollar.split(".");
    const nodeId = parts[0];
    const fieldPath = parts.slice(1).join(".");

    const varName = nodeIdToVarName.get(nodeId);
    if (!varName) {
      return match; // Node not found, keep original
    }

    if (!fieldPath) {
      return `\${${varName}}`;
    }

    const accessPath = buildAccessPath(fieldPath);
    return `\${${varName}${accessPath}}`;
  }

  // Helper to process @nodeId:DisplayName.field format for JavaScript expressions (not template strings)
  function processAtFormatForExpression(
    trimmed: string,
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

    const varName = nodeIdToVarName.get(nodeId);
    if (!varName) {
      return match; // Node not found, keep original
    }

    if (!fieldPath) {
      return varName;
    }

    const accessPath = buildAccessPath(fieldPath);
    return `${varName}${accessPath}`;
  }

  // Helper to process $nodeId.field format for JavaScript expressions (not template strings)
  function processDollarFormatForExpression(
    trimmed: string,
    match: string
  ): string {
    const withoutDollar = trimmed.substring(1);
    const parts = withoutDollar.split(".");
    const nodeId = parts[0];
    const fieldPath = parts.slice(1).join(".");

    const varName = nodeIdToVarName.get(nodeId);
    if (!varName) {
      return match; // Node not found, keep original
    }

    if (!fieldPath) {
      return varName;
    }

    const accessPath = buildAccessPath(fieldPath);
    return `${varName}${accessPath}`;
  }

  // Helper to convert template variables to JavaScript expressions for template strings
  function convertTemplateToJS(template: string): string {
    if (!template || typeof template !== "string") {
      return template;
    }

    return template.replace(TEMPLATE_PATTERN, (match, expression) => {
      const trimmed = expression.trim();

      if (trimmed.startsWith("@")) {
        return processAtFormat(trimmed, match);
      }

      if (trimmed.startsWith("$")) {
        return processDollarFormat(trimmed, match);
      }

      return match;
    });
  }

  // Helper to convert template variables to JavaScript expressions (not template literal syntax)
  function convertConditionToJS(condition: string): string {
    if (!condition || typeof condition !== "string") {
      return condition;
    }

    // First remove invisible characters (non-breaking spaces, etc.)
    const cleaned = removeInvisibleChars(condition);

    // Then convert template references
    const converted = cleaned.replace(TEMPLATE_PATTERN, (match, expression) => {
      const trimmed = expression.trim();

      if (trimmed.startsWith("@")) {
        return processAtFormatForExpression(trimmed, match);
      }

      if (trimmed.startsWith("$")) {
        return processDollarFormatForExpression(trimmed, match);
      }

      return match;
    });

    // Final cleanup to ensure no non-breaking spaces remain
    return removeInvisibleChars(converted);
  }

  // Helper functions to generate code for different action types
  function generateEmailActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Send Email");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const emailTo = (config.emailTo as string) || "user@example.com";
    const emailSubject = (config.emailSubject as string) || "Notification";
    const emailBody = (config.emailBody as string) || "No content";

    const convertedEmailTo = convertTemplateToJS(emailTo);
    const convertedSubject = convertTemplateToJS(emailSubject);
    const convertedBody = convertTemplateToJS(emailBody);

    // Check if template references are used (converted string contains ${)
    const hasTemplateRefs = (str: string) => str.includes("${");

    // Escape template expressions for the outer template literal (use $$ to escape $)
    const escapeForOuterTemplate = (str: string) => str.replace(/\$\{/g, "$${");

    // Build values - use template literals if references exist, otherwise use string literals
    const emailToValue = hasTemplateRefs(convertedEmailTo)
      ? `\`${escapeForOuterTemplate(convertedEmailTo).replace(/`/g, "\\`")}\``
      : `'${emailTo.replace(/'/g, "\\'")}'`;
    const subjectValue = hasTemplateRefs(convertedSubject)
      ? `\`${escapeForOuterTemplate(convertedSubject).replace(/`/g, "\\`")}\``
      : `'${emailSubject.replace(/'/g, "\\'")}'`;
    const bodyValue = hasTemplateRefs(convertedBody)
      ? `\`${escapeForOuterTemplate(convertedBody).replace(/`/g, "\\`")}\``
      : `'${emailBody.replace(/'/g, "\\'")}'`;

    return [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  emailTo: ${emailToValue},`,
      `${indent}  emailSubject: ${subjectValue},`,
      `${indent}  emailBody: ${bodyValue},`,
      `${indent}});`,
    ];
  }

  function generateTicketActionCode(indent: string, varName: string): string[] {
    imports.add("import { createTicket } from './integrations/linear';");
    return [
      `${indent}const ${varName} = await createTicket({`,
      `${indent}  title: 'New Ticket',`,
      `${indent}  description: '',`,
      `${indent}});`,
    ];
  }

  function generateDatabaseActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Database Query");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const dbQuery = (config.dbQuery as string) || "";
    const dataSource = (config.dataSource as string) || "";
    const tableName =
      (config.dbTable as string) ||
      (config.tableName as string) ||
      "your_table";

    const lines = [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
    ];

    // dataSource as an object
    if (dataSource) {
      lines.push(`${indent}  dataSource: { name: "${dataSource}" },`);
    } else {
      lines.push(`${indent}  dataSource: {},`);
    }

    // query: SQL query if provided, otherwise table name
    if (dbQuery) {
      // Convert template references in SQL query
      const convertedQuery = convertTemplateToJS(dbQuery);
      const hasTemplateRefs = convertedQuery.includes("${");

      // Escape backticks and template literal syntax for SQL query
      const escapeForOuterTemplate = (str: string) =>
        str.replace(/\$\{/g, "$${");
      const queryValue = hasTemplateRefs
        ? `\`${escapeForOuterTemplate(convertedQuery).replace(/`/g, "\\`")}\``
        : `\`${dbQuery.replace(/`/g, "\\`")}\``;

      lines.push(`${indent}  query: ${queryValue},`);
    } else {
      // Use table name as query string
      lines.push(`${indent}  query: "${tableName}",`);
    }

    lines.push(`${indent}});`);
    return lines;
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
      `${indent}  body: {},`,
      `${indent}});`,
    ];
  }

  // Helper to process AI schema and convert to TypeScript literal
  function processAiSchema(aiSchema: string | undefined): string | null {
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

  // Helper to generate prompt value with template handling
  function generatePromptValue(aiPrompt: string): string {
    const convertedPrompt = convertTemplateToJS(aiPrompt);
    const hasTemplateRefs = convertedPrompt.includes("${");
    const escapeForOuterTemplate = (str: string) => str.replace(/\$\{/g, "$${");

    if (hasTemplateRefs) {
      return `\`${escapeForOuterTemplate(convertedPrompt).replace(/`/g, "\\`")}\``;
    }
    return `\`${aiPrompt.replace(/`/g, "\\`")}\``;
  }

  function generateAiTextActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Generate Text");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const aiPrompt = (config.aiPrompt as string) || "Generate a summary";
    const aiModel = (config.aiModel as string) || "gpt-4o-mini";
    const aiFormat = (config.aiFormat as string) || "text";
    const aiSchema = config.aiSchema as string | undefined;

    const promptValue = generatePromptValue(aiPrompt);

    const lines = [
      `${indent}// Generate text using AI`,
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  model: "${aiModel}",`,
      `${indent}  prompt: ${promptValue},`,
    ];

    if (aiFormat === "object") {
      lines.push(`${indent}  format: "object",`);
      const schemaString = processAiSchema(aiSchema);
      if (schemaString) {
        lines.push(`${indent}  schema: ${schemaString},`);
      }
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
    nodeId: string,
    indent: string,
    varName: string
  ): string[] {
    const actionType = node.data.config?.actionType as string;
    const endpoint = node.data.config?.endpoint as string;
    const label = node.data.label.toLowerCase();

    // Use label if available, otherwise fall back to action type
    const actionLabel = node.data.label || actionType || "Unknown Action";
    const lines: string[] = [`${indent}// Action: ${actionLabel}`];

    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }

    // Check if this node's output is used
    const outputIsUsed = usedNodeOutputs.has(nodeId);

    // Helper to process a line with await statement
    function processAwaitLine(line: string): string {
      const match = CONST_ASSIGNMENT_PATTERN.exec(line);
      if (match) {
        const [, lineIndent, , rest] = match;
        return `${lineIndent}${rest}`;
      }
      return line;
    }

    // Helper to process a line with const assignment
    function processConstLine(line: string): string {
      const match = CONST_ASSIGNMENT_PATTERN.exec(line);
      if (match) {
        const [, lineIndent, , rest] = match;
        return `${lineIndent}void ${rest}`;
      }
      return line;
    }

    // Helper to remove variable assignment from action lines
    function removeVariableAssignment(actionLines: string[]): string[] {
      const result: string[] = [];
      for (const line of actionLines) {
        if (line.includes("await")) {
          result.push(processAwaitLine(line));
        } else if (line.trim().startsWith("const") && line.includes("{")) {
          result.push(processConstLine(line));
        } else {
          result.push(line);
        }
      }
      return result;
    }

    // Helper to conditionally wrap action call with variable assignment
    const wrapActionCall = (actionLines: string[]): string[] => {
      if (outputIsUsed) {
        // Keep variable assignment
        return actionLines;
      }
      // Remove variable assignment, just call the function
      return removeVariableAssignment(actionLines);
    };

    // Check explicit actionType first, then fall back to label matching
    // Order matters: more specific types first
    if (actionType === "Generate Text") {
      lines.push(
        ...wrapActionCall(generateAiTextActionCode(node, indent, varName))
      );
    } else if (actionType === "Generate Image") {
      lines.push(
        ...wrapActionCall(generateAiImageActionCode(node, indent, varName))
      );
    } else if (actionType === "Send Email") {
      lines.push(
        ...wrapActionCall(generateEmailActionCode(node, indent, varName))
      );
    } else if (actionType === "Send Slack Message") {
      lines.push(
        ...wrapActionCall(generateSlackActionCode(node, indent, varName))
      );
    } else if (actionType === "Create Ticket") {
      lines.push(...wrapActionCall(generateTicketActionCode(indent, varName)));
    } else if (actionType === "Create Linear Issue") {
      lines.push(...wrapActionCall(generateLinearActionCode(indent, varName)));
    } else if (actionType === "Find Issues") {
      lines.push(
        ...wrapActionCall(generateFindIssuesActionCode(indent, varName))
      );
    } else if (actionType === "Database Query") {
      lines.push(
        ...wrapActionCall(generateDatabaseActionCode(node, indent, varName))
      );
    } else if (actionType === "HTTP Request" || endpoint) {
      lines.push(
        ...wrapActionCall(generateHTTPActionCode(indent, varName, endpoint))
      );
    } else if (label.includes("generate text") && !label.includes("email")) {
      // Fallback: check label but avoid matching "email" in labels
      lines.push(
        ...wrapActionCall(generateAiTextActionCode(node, indent, varName))
      );
    } else if (label.includes("generate image")) {
      lines.push(
        ...wrapActionCall(generateAiImageActionCode(node, indent, varName))
      );
    } else if (
      label.includes("send email") ||
      (label.includes("email") && !label.includes("generate"))
    ) {
      // Only match email if it doesn't contain "generate"
      lines.push(
        ...wrapActionCall(generateEmailActionCode(node, indent, varName))
      );
    } else if (label.includes("slack")) {
      lines.push(
        ...wrapActionCall(generateSlackActionCode(node, indent, varName))
      );
    } else if (label.includes("linear") || actionType === "linear") {
      lines.push(...wrapActionCall(generateLinearActionCode(indent, varName)));
    } else if (label.includes("database")) {
      lines.push(
        ...wrapActionCall(generateDatabaseActionCode(node, indent, varName))
      );
    } else if (label.includes("ticket")) {
      lines.push(...wrapActionCall(generateTicketActionCode(indent, varName)));
    } else if (label.includes("find issues")) {
      lines.push(
        ...wrapActionCall(generateFindIssuesActionCode(indent, varName))
      );
    } else if (outputIsUsed) {
      lines.push(`${indent}const ${varName} = { status: 'success' };`);
    } else {
      lines.push(`${indent}void ({ status: 'success' });`);
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

      // Convert template references in condition to JavaScript expressions (not template literal syntax)
      const convertedCondition = condition
        ? convertConditionToJS(condition)
        : "true";

      lines.push(`${indent}if (${convertedCondition}) {`);
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
    nodeId: string,
    varName: string,
    indent: string
  ): string[] {
    // Skip trigger code entirely if trigger outputs aren't used
    if (!usedNodeOutputs.has(nodeId)) {
      return [];
    }

    const lines: string[] = [];
    lines.push(`${indent}// Trigger: ${node.data.label}`);
    if (node.data.description) {
      lines.push(`${indent}// ${node.data.description}`);
    }

    lines.push(`${indent}const ${varName} = { triggered: true };`);
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
    lines.push(`${indent}  transformed: true,`);
    lines.push(`${indent}  timestamp: Date.now(),`);
    lines.push(`${indent}};`);
    return lines;
  }

  // Helper to process trigger node
  function processTriggerNode(
    node: WorkflowNode,
    nodeId: string,
    varName: string,
    indent: string
  ): { lines: string[]; wasSkipped: boolean } {
    const triggerCode = generateTriggerCode(node, nodeId, varName, indent);
    // If trigger was skipped (empty array), process next nodes
    if (triggerCode.length === 0) {
      const lines: string[] = [];
      const nextNodes = edgesBySource.get(nodeId) || [];
      for (const nextNodeId of nextNodes) {
        const nextCode = generateNodeCode(nextNodeId, indent);
        lines.push(...nextCode);
      }
      return { lines, wasSkipped: true };
    }
    return { lines: triggerCode, wasSkipped: false };
  }

  // Helper to process action node
  function processActionNode(
    node: WorkflowNode,
    nodeId: string,
    varName: string,
    indent: string
  ): string[] {
    const lines: string[] = [];
    const actionType = node.data.config?.actionType as string;
    // Handle condition as an action type
    if (actionType === "Condition") {
      lines.push(...generateConditionNodeCode(node, nodeId, indent));
      return lines;
    }
    lines.push(...generateActionNodeCode(node, nodeId, indent, varName));
    return lines;
  }

  // Helper to process next nodes recursively
  function processNextNodes(
    nodeId: string,
    currentLines: string[],
    indent: string
  ): string[] {
    const nextNodes = edgesBySource.get(nodeId) || [];
    const result = [...currentLines];

    // Only add blank line if we actually generated code for this node AND there are more nodes
    if (currentLines.length > 0 && nextNodes.length > 0) {
      result.push("");
    }

    for (const nextNodeId of nextNodes) {
      const nextCode = generateNodeCode(nextNodeId, indent);
      result.push(...nextCode);
    }

    return result;
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

    // Use friendly variable name from map, fallback to node type + id if not found
    const varName =
      nodeIdToVarName.get(nodeId) ||
      `${node.data.type}_${nodeId.replace(/-/g, "_")}`;

    let lines: string[] = [];

    switch (node.data.type) {
      case "trigger": {
        const { lines: triggerLines, wasSkipped } = processTriggerNode(
          node,
          nodeId,
          varName,
          indent
        );
        // If trigger was skipped, triggerLines already contains next nodes
        if (wasSkipped) {
          return triggerLines; // Already processed next nodes
        }
        return processNextNodes(nodeId, triggerLines, indent);
      }

      case "action": {
        const actionLines = processActionNode(node, nodeId, varName, indent);
        // Conditions return early from processActionNode, so check if it's a condition
        const actionType = node.data.config?.actionType as string;
        if (actionType === "Condition") {
          return actionLines; // Already processed, don't process next nodes
        }
        lines = actionLines;
        break;
      }

      default:
        lines.push(`${indent}// Unknown node type: ${node.data.type}`);
        break;
    }

    return processNextNodes(nodeId, lines, indent);
  }

  // Generate code starting from trigger nodes
  if (triggerNodes.length === 0) {
    codeLines.push("  // No trigger nodes found");
  } else {
    for (const trigger of triggerNodes) {
      const triggerCode = generateNodeCode(trigger.id, "  ");
      codeLines.push(...triggerCode);
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
