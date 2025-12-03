import { findActionById, flattenConfigFields } from "@/plugins";
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

  // Check if any trigger's output is used (meaning input param is needed)
  const inputIsUsed = triggerNodes.some((trigger) =>
    usedNodeOutputs.has(trigger.id)
  );

  // Generate code for each node
  const codeLines: string[] = [];
  const visited = new Set<string>();

  // Generate function signature
  const functionSignature = inputIsUsed
    ? `export async function ${functionName}<TInput>(input: TInput) {`
    : `export async function ${functionName}() {`;
  codeLines.push(functionSignature);
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
      // For triggers, use `input` directly - no intermediate variable needed
      varName = "input";
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

  function generateTicketActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Create Ticket");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const ticketTitle = (config.ticketTitle as string) || "New Ticket";
    const ticketDescription = (config.ticketDescription as string) || "";

    const convertedTitle = convertTemplateToJS(ticketTitle);
    const convertedDescription = convertTemplateToJS(ticketDescription);
    const hasTemplateRefs = (str: string) => str.includes("${");
    const escapeForOuterTemplate = (str: string) => str.replace(/\$\{/g, "$${");

    const titleValue = hasTemplateRefs(convertedTitle)
      ? `\`${escapeForOuterTemplate(convertedTitle).replace(/`/g, "\\`")}\``
      : `'${ticketTitle.replace(/'/g, "\\'")}'`;
    const descValue = hasTemplateRefs(convertedDescription)
      ? `\`${escapeForOuterTemplate(convertedDescription).replace(/`/g, "\\`")}\``
      : `'${ticketDescription.replace(/'/g, "\\'")}'`;

    return [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  ticketTitle: ${titleValue},`,
      `${indent}  ticketDescription: ${descValue},`,
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
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("HTTP Request");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const endpoint =
      (config.endpoint as string) || "https://api.example.com/endpoint";
    const method = (config.httpMethod as string) || "POST";

    return [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  url: '${endpoint}',`,
      `${indent}  method: '${method}',`,
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
    const aiModel = (config.aiModel as string) || "meta/llama-4-scout";
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
    imports.add(
      "import { experimental_generateImage as generateImage } from 'ai';"
    );
    const imagePrompt =
      (node.data.config?.imagePrompt as string) || "A beautiful landscape";
    const imageModel =
      (node.data.config?.imageModel as string) || "google/imagen-4.0-generate";

    return [
      `${indent}// Generate image using AI`,
      `${indent}const ${varName} = await generateImage({`,
      `${indent}  model: "${imageModel}",`,
      `${indent}  prompt: \`${imagePrompt}\`,`,
      `${indent}  size: "1024x1024",`,
      `${indent}});`,
    ];
  }

  function generateSlackActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Send Slack Message");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const slackChannel = (config.slackChannel as string) || "#general";
    const slackMessage = (config.slackMessage as string) || "Message content";

    const convertedChannel = convertTemplateToJS(slackChannel);
    const convertedMessage = convertTemplateToJS(slackMessage);
    const hasTemplateRefs = (str: string) => str.includes("${");
    const escapeForOuterTemplate = (str: string) => str.replace(/\$\{/g, "$${");

    const channelValue = hasTemplateRefs(convertedChannel)
      ? `\`${escapeForOuterTemplate(convertedChannel).replace(/`/g, "\\`")}\``
      : `"${slackChannel}"`;
    const messageValue = hasTemplateRefs(convertedMessage)
      ? `\`${escapeForOuterTemplate(convertedMessage).replace(/`/g, "\\`")}\``
      : `"${slackMessage}"`;

    return [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  slackChannel: ${channelValue},`,
      `${indent}  slackMessage: ${messageValue},`,
      `${indent}});`,
    ];
  }

  function formatTemplateValue(value: string): string {
    const converted = convertTemplateToJS(value);
    const hasTemplateRefs = converted.includes("${");
    const escaped = converted.replace(/\$\{/g, "$${").replace(/`/g, "\\`");
    return hasTemplateRefs
      ? `\`${escaped}\``
      : `\`${value.replace(/`/g, "\\`")}\``;
  }

  function generateFirecrawlActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const actionType = node.data.config?.actionType as string;
    const stepInfo = getStepInfo(actionType);
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const url = (config.url as string) || "";
    const query = (config.query as string) || "";
    const limit = config.limit ? Number(config.limit) : undefined;

    const lines = [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
    ];

    if (url) {
      lines.push(`${indent}  url: ${formatTemplateValue(url)},`);
    }
    if (query) {
      lines.push(`${indent}  query: ${formatTemplateValue(query)},`);
    }
    if (limit) {
      lines.push(`${indent}  limit: ${limit},`);
    }

    lines.push(`${indent}});`);
    return lines;
  }

  function generateV0CreateChatActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Create Chat");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const message = (config.message as string) || "";
    const system = (config.system as string) || "";

    const lines = [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  message: ${formatTemplateValue(message)},`,
    ];

    if (system) {
      lines.push(`${indent}  system: ${formatTemplateValue(system)},`);
    }

    lines.push(`${indent}});`);
    return lines;
  }

  function generateV0SendMessageActionCode(
    node: WorkflowNode,
    indent: string,
    varName: string
  ): string[] {
    const stepInfo = getStepInfo("Send Message");
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const chatId = (config.chatId as string) || "";
    const message = (config.message as string) || "";

    const lines = [
      `${indent}const ${varName} = await ${stepInfo.functionName}({`,
      `${indent}  chatId: ${formatTemplateValue(chatId)},`,
      `${indent}  message: ${formatTemplateValue(message)},`,
      `${indent}});`,
    ];

    return lines;
  }

  /**
   * Format a config field value based on its type
   */
  function formatFieldValue(
    fieldType: string,
    value: unknown,
    indent: string,
    key: string
  ): string {
    const fieldTypeFormatters: Record<string, () => string> = {
      "template-input": () =>
        `${indent}  ${key}: ${formatTemplateValue(String(value))},`,
      "template-textarea": () =>
        `${indent}  ${key}: ${formatTemplateValue(String(value))},`,
      number: () => `${indent}  ${key}: ${value},`,
      select: () => `${indent}  ${key}: "${value}",`,
      "schema-builder": () => `${indent}  ${key}: ${JSON.stringify(value)},`,
    };

    const formatter = fieldTypeFormatters[fieldType];
    return formatter ? formatter() : `${indent}  ${key}: "${value}",`;
  }

  /**
   * Generate code for plugin-based actions discovered from the plugin registry
   */
  function generatePluginActionCode(
    node: WorkflowNode,
    actionType: string,
    indent: string,
    varName: string
  ): string[] | null {
    const action = findActionById(actionType);
    if (!action) {
      return null;
    }

    const stepInfo = getStepInfo(actionType);
    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const config = node.data.config || {};
    const configFields = flattenConfigFields(action.configFields);

    // Build parameter lines from config fields
    const paramLines: string[] = [];
    for (const field of configFields) {
      const value = config[field.key];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      paramLines.push(formatFieldValue(field.type, value, indent, field.key));
    }

    // Generate the function call
    const lines: string[] = [];
    if (paramLines.length > 0) {
      lines.push(
        `${indent}const ${varName} = await ${stepInfo.functionName}({`
      );
      lines.push(...paramLines);
      lines.push(`${indent}});`);
    } else {
      lines.push(
        `${indent}const ${varName} = await ${stepInfo.functionName}({});`
      );
    }

    return lines;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Action type routing requires many conditionals
  function generateActionNodeCode(
    node: WorkflowNode,
    nodeId: string,
    indent: string,
    varName: string
  ): string[] {
    const actionType = node.data.config?.actionType as string;

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

    // Check explicit actionType first
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
      lines.push(
        ...wrapActionCall(generateTicketActionCode(node, indent, varName))
      );
    } else if (actionType === "Scrape" || actionType === "Search") {
      lines.push(
        ...wrapActionCall(generateFirecrawlActionCode(node, indent, varName))
      );
    } else if (actionType === "Create Chat") {
      lines.push(
        ...wrapActionCall(generateV0CreateChatActionCode(node, indent, varName))
      );
    } else if (actionType === "Send Message") {
      lines.push(
        ...wrapActionCall(
          generateV0SendMessageActionCode(node, indent, varName)
        )
      );
    } else if (actionType === "Database Query") {
      lines.push(
        ...wrapActionCall(generateDatabaseActionCode(node, indent, varName))
      );
    } else if (actionType === "HTTP Request") {
      lines.push(
        ...wrapActionCall(generateHTTPActionCode(node, indent, varName))
      );
    } else {
      // Try to find the action in the plugin registry
      const pluginCode = generatePluginActionCode(
        node,
        actionType,
        indent,
        varName
      );
      if (pluginCode) {
        lines.push(...wrapActionCall(pluginCode));
      } else if (outputIsUsed) {
        // Unknown action type - generate placeholder
        lines.push(`${indent}// TODO: Implement action type "${actionType}"`);
        lines.push(
          `${indent}const ${varName} = { status: 'pending', actionType: "${actionType}" };`
        );
      } else {
        lines.push(`${indent}// TODO: Implement action type "${actionType}"`);
        lines.push(
          `${indent}void ({ status: 'pending', actionType: "${actionType}" });`
        );
      }
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

  // Helper to process trigger node - triggers use the `input` parameter directly
  // so no code generation is needed, just process next nodes
  function processTriggerNode(
    nodeId: string,
    indent: string
  ): { lines: string[]; wasSkipped: boolean } {
    const nextNodes = edgesBySource.get(nodeId) || [];
    const lines = generateParallelNodeCode(nextNodes, indent);
    return { lines, wasSkipped: true };
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

  /**
   * Generate code for a complete branch (node + all descendants)
   * Used inside async IIFEs for parallel branches
   */
  function generateBranchCode(
    nodeId: string,
    indent: string,
    branchVisited: Set<string>
  ): string[] {
    if (branchVisited.has(nodeId)) {
      return [];
    }
    branchVisited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    const lines: string[] = [];

    if (node.data.type === "action") {
      const actionType = node.data.config?.actionType as string;

      if (actionType === "Condition") {
        // Generate condition as if/else
        lines.push(
          ...generateConditionBranchCode(node, nodeId, indent, branchVisited)
        );
      } else {
        // Generate regular action
        lines.push(...generateActionCallCode(node, indent));

        // Process children
        const children = edgesBySource.get(nodeId) || [];
        if (children.length > 0) {
          lines.push("");
          lines.push(...generateChildrenCode(children, indent, branchVisited));
        }
      }
    }

    return lines;
  }

  /**
   * Generate condition branch code with if/else
   */
  function generateConditionBranchCode(
    node: WorkflowNode,
    nodeId: string,
    indent: string,
    branchVisited: Set<string>
  ): string[] {
    const lines: string[] = [`${indent}// Condition: ${node.data.label}`];
    const condition = node.data.config?.condition as string;
    const nextNodes = edgesBySource.get(nodeId) || [];

    if (nextNodes.length > 0) {
      const convertedCondition = condition
        ? convertConditionToJS(condition)
        : "true";

      lines.push(`${indent}if (${convertedCondition}) {`);
      if (nextNodes[0]) {
        lines.push(
          ...generateBranchCode(nextNodes[0], `${indent}  `, branchVisited)
        );
      }
      if (nextNodes[1]) {
        lines.push(`${indent}} else {`);
        lines.push(
          ...generateBranchCode(nextNodes[1], `${indent}  `, branchVisited)
        );
      }
      lines.push(`${indent}}`);
    }

    return lines;
  }

  /**
   * Generate a single action call with await
   */
  function generateActionCallCode(
    node: WorkflowNode,
    indent: string
  ): string[] {
    const actionType = node.data.config?.actionType as string;
    const actionLabel = node.data.label || actionType || "Unknown Action";
    const stepInfo = getStepInfo(actionType);
    const configParams = buildActionConfigParams(node, `${indent}  `);

    imports.add(
      `import { ${stepInfo.functionName} } from '${stepInfo.importPath}';`
    );

    const lines: string[] = [`${indent}// ${actionLabel}`];
    if (configParams.length > 0) {
      lines.push(`${indent}await ${stepInfo.functionName}({`);
      lines.push(...configParams);
      lines.push(`${indent}});`);
    } else {
      lines.push(`${indent}await ${stepInfo.functionName}({});`);
    }

    return lines;
  }

  /**
   * Generate code for children nodes, handling parallel branches
   */
  function generateChildrenCode(
    childIds: string[],
    indent: string,
    branchVisited: Set<string>
  ): string[] {
    const unvisited = childIds.filter((id) => !branchVisited.has(id));
    if (unvisited.length === 0) {
      return [];
    }
    if (unvisited.length === 1) {
      return generateBranchCode(unvisited[0], indent, branchVisited);
    }

    // Multiple children - generate Promise.all with async IIFEs
    const lines: string[] = [`${indent}await Promise.all([`];

    for (let i = 0; i < unvisited.length; i++) {
      const childId = unvisited[i];
      const isLast = i === unvisited.length - 1;
      const comma = isLast ? "" : ",";

      // Create a new visited set for this branch
      const childBranchVisited = new Set(branchVisited);
      const branchCode = generateBranchCode(
        childId,
        `${indent}    `,
        childBranchVisited
      );

      if (branchCode.length > 0) {
        lines.push(`${indent}  (async () => {`);
        lines.push(...branchCode);
        lines.push(`${indent}  })()${comma}`);
      }
    }

    lines.push(`${indent}]);`);
    return lines;
  }

  /**
   * Generate a single async IIFE branch for Promise.all
   */
  function generateAsyncIIFEBranch(
    nodeId: string,
    indent: string,
    isLast: boolean
  ): string[] {
    const branchVisited = new Set(visited);
    branchVisited.delete(nodeId);
    const branchCode = generateBranchCode(
      nodeId,
      `${indent}    `,
      branchVisited
    );
    const comma = isLast ? "" : ",";

    if (branchCode.length === 0) {
      return [];
    }

    return [
      `${indent}  (async () => {`,
      ...branchCode,
      `${indent}  })()${comma}`,
    ];
  }

  /**
   * Generate code for multiple nodes from trigger
   */
  function generateParallelNodeCode(
    nodeIds: string[],
    indent: string
  ): string[] {
    if (nodeIds.length === 0) {
      return [];
    }

    const unvisited = nodeIds.filter(
      (id) => !visited.has(id) && nodeMap.get(id)?.data.type === "action"
    );

    if (unvisited.length === 0) {
      return [];
    }
    if (unvisited.length === 1) {
      const branchVisited = new Set(visited);
      visited.add(unvisited[0]);
      return generateBranchCode(unvisited[0], indent, branchVisited);
    }

    // Mark all as visited first to prevent cross-branch processing
    for (const id of unvisited) {
      visited.add(id);
    }

    // Multiple branches - wrap each in async IIFE
    const lines: string[] = [`${indent}await Promise.all([`];
    for (let i = 0; i < unvisited.length; i++) {
      lines.push(
        ...generateAsyncIIFEBranch(
          unvisited[i],
          indent,
          i === unvisited.length - 1
        )
      );
    }
    lines.push(`${indent}]);`);

    return lines;
  }

  /**
   * Build config parameters for plugin-based action
   */
  function buildPluginConfigParams(
    config: Record<string, unknown>,
    actionType: string,
    indent: string
  ): string[] {
    const action = findActionById(actionType);
    if (!action) {
      return [];
    }

    const params: string[] = [];
    for (const field of flattenConfigFields(action.configFields)) {
      const value = config[field.key];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      params.push(formatFieldValue(field.type, value, indent, field.key));
    }
    return params;
  }

  // Keys to exclude from generated code (internal app fields)
  const EXCLUDED_CONFIG_KEYS = new Set(["actionType", "integrationId"]);

  /**
   * Build config parameters using fallback logic
   */
  function buildFallbackConfigParams(
    config: Record<string, unknown>,
    indent: string
  ): string[] {
    const params: string[] = [];
    for (const [key, value] of Object.entries(config)) {
      if (
        EXCLUDED_CONFIG_KEYS.has(key) ||
        value === undefined ||
        value === null
      ) {
        continue;
      }
      if (typeof value === "string") {
        params.push(`${indent}${key}: ${formatTemplateValue(value)},`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        params.push(`${indent}${key}: ${value},`);
      } else {
        params.push(`${indent}${key}: ${JSON.stringify(value)},`);
      }
    }
    return params;
  }

  /**
   * Build config parameters for an action node
   */
  function buildActionConfigParams(
    node: WorkflowNode,
    indent: string
  ): string[] {
    const actionType = node.data.config?.actionType as string;
    const config = node.data.config || {};

    const pluginParams = buildPluginConfigParams(config, actionType, indent);
    if (pluginParams.length > 0) {
      return pluginParams;
    }

    return buildFallbackConfigParams(config, indent);
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

    result.push(...generateParallelNodeCode(nextNodes, indent));

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
          nodeId,
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
