import "server-only";

import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

/**
 * Convert template variables to JavaScript expressions
 * Converts {{@nodeId:DisplayName.field}} to ${outputs?.['nodeId']?.data?.field}
 */
function convertTemplateToJS(template: string): string {
  if (!template || typeof template !== "string") {
    return template;
  }

  // Match {{...}} patterns
  const pattern = /\{\{([^}]+)\}\}/g;

  return template.replace(pattern, (match, expression) => {
    const trimmed = expression.trim();

    // Check if this is a new format ID reference (starts with @)
    if (trimmed.startsWith("@")) {
      // Format: @nodeId:DisplayName or @nodeId:DisplayName.field
      const withoutAt = trimmed.substring(1);
      const colonIndex = withoutAt.indexOf(":");

      if (colonIndex === -1) {
        return match; // Invalid format, keep original
      }

      const nodeId = withoutAt.substring(0, colonIndex);
      const rest = withoutAt.substring(colonIndex + 1);

      // Check if there's a field accessor after the display name
      const dotIndex = rest.indexOf(".");
      const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

      // Sanitize node ID for use as object key
      const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");

      // Handle special case: {{@nodeId:DisplayName}} (entire output)
      if (!fieldPath) {
        return `\${outputs?.['${sanitizedNodeId}']?.data}`;
      }

      // Parse field path like "field.nested" or "items[0]"
      const accessPath = fieldPath
        .split(".")
        .map((part: string) => {
          // Handle array access
          const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
          if (arrayMatch) {
            return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
          }
          return `?.${part}`;
        })
        .join("");

      return `\${outputs?.['${sanitizedNodeId}']?.data${accessPath}}`;
    }
    // Check if this is a legacy node ID reference (starts with $)
    if (trimmed.startsWith("$")) {
      const withoutDollar = trimmed.substring(1);

      // Handle special case: {{$nodeId}} (entire output)
      if (!(withoutDollar.includes(".") || withoutDollar.includes("["))) {
        const sanitizedNodeId = withoutDollar.replace(/[^a-zA-Z0-9]/g, "_");
        return `\${outputs?.['${sanitizedNodeId}']?.data}`;
      }

      // Parse expression like "$nodeId.field.nested"
      const parts = withoutDollar.split(".");
      const nodeId = parts[0];
      const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
      const fieldPath = parts.slice(1).join(".");

      if (!fieldPath) {
        return `\${outputs?.['${sanitizedNodeId}']?.data}`;
      }

      const accessPath = fieldPath
        .split(".")
        .map((part: string) => {
          const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
          if (arrayMatch) {
            return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
          }
          return `?.${part}`;
        })
        .join("");

      return `\${outputs?.['${sanitizedNodeId}']?.data${accessPath}}`;
    }

    // For legacy label-based references, keep them as is for now
    // They will be processed at runtime
    return match;
  });
}

/**
 * Escape a string for safe use in template literals
 * Only escapes backslashes and backticks
 */
function escapeForTemplateLiteral(str: string): string {
  if (!str) {
    return "";
  }
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/`/g, "\\`"); // Escape backticks
}

/**
 * Generate workflow SDK code from workflow definition
 * This generates proper "use workflow" and "use step" code
 */
export function generateWorkflowSDKCode(
  workflowName: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string {
  const imports = new Set<string>();
  const stepFunctions: string[] = [];

  // Build a map of node connections
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgesBySource = new Map<string, string[]>();
  edges.forEach((edge) => {
    const targets = edgesBySource.get(edge.source) || [];
    targets.push(edge.target);
    edgesBySource.set(edge.source, targets);
  });

  // Find trigger nodes
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const triggerNodes = nodes.filter(
    (node) => node.data.type === "trigger" && !nodesWithIncoming.has(node.id)
  );

  // Always import sleep and FatalError
  imports.add("import { sleep, FatalError } from 'workflow';");

  function generateStepFunction(
    node: WorkflowNode,
    uniqueStepName?: string
  ): string {
    // Use provided unique step name or generate one
    const config = node.data.config || {};
    const actionType = config.actionType as string;
    const label = node.data.label || actionType || "UnnamedStep";
    const stepName = uniqueStepName || sanitizeStepName(label);

    let stepBody = "";

    switch (node.data.type) {
      case "action":
        if (actionType === "Send Email") {
          imports.add("import { Resend } from 'resend';");
          const emailTo = (config.emailTo as string) || "user@example.com";
          const emailSubject =
            (config.emailSubject as string) || "Notification";
          const emailBody = (config.emailBody as string) || "No content";

          const convertedEmailTo = convertTemplateToJS(emailTo);
          const convertedSubject = convertTemplateToJS(emailSubject);
          const convertedBody = convertTemplateToJS(emailBody);

          stepBody = `  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // Use template literals with dynamic values from outputs
  const emailTo = \`${escapeForTemplateLiteral(convertedEmailTo)}\`;
  const emailSubject = \`${escapeForTemplateLiteral(convertedSubject)}\`;
  const emailBody = \`${escapeForTemplateLiteral(convertedBody)}\`;
  
  const result = await resend.emails.send({
    from: '${config.resendFromEmail || "onboarding@resend.dev"}',
    to: (input.emailTo as string) || emailTo,
    subject: (input.emailSubject as string) || emailSubject,
    text: (input.emailBody as string) || emailBody,
  });
  
  console.log('Email sent:', result);
  return result;`;
        } else if (actionType === "Send Slack Message") {
          imports.add("import { WebClient } from '@slack/web-api';");
          const slackMessage = (config.slackMessage as string) || "No message";
          const slackChannel = (config.slackChannel as string) || "#general";
          const convertedSlackMessage = convertTemplateToJS(slackMessage);
          const convertedSlackChannel = convertTemplateToJS(slackChannel);

          stepBody = `  const slack = new WebClient(process.env.SLACK_API_KEY);
  
  // Use template literals with dynamic values from outputs
  const slackMessage = \`${escapeForTemplateLiteral(convertedSlackMessage)}\`;
  const slackChannel = \`${escapeForTemplateLiteral(convertedSlackChannel)}\`;
  
  const result = await slack.chat.postMessage({
    channel: (input.slackChannel as string) || slackChannel,
    text: (input.slackMessage as string) || slackMessage,
  });
  
  console.log('Slack message sent:', result);
  return result;`;
        } else if (actionType === "Create Ticket") {
          imports.add("import { LinearClient } from '@linear/sdk';");
          const ticketTitle = (config.ticketTitle as string) || "New Issue";
          const ticketDescription = (config.ticketDescription as string) || "";
          const convertedTitle = convertTemplateToJS(ticketTitle);
          const convertedDescription = convertTemplateToJS(ticketDescription);

          stepBody = `  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  
  // Use template literals with dynamic values from outputs
  const ticketTitle = \`${escapeForTemplateLiteral(convertedTitle)}\`;
  const ticketDescription = \`${escapeForTemplateLiteral(convertedDescription)}\`;
  
  const issue = await linear.issueCreate({
    title: (input.ticketTitle as string) || ticketTitle,
    description: (input.ticketDescription as string) || ticketDescription,
    teamId: process.env.LINEAR_TEAM_ID!,
  });
  
  console.log('Linear issue created:', issue);
  return issue;`;
        } else if (actionType === "Generate Text") {
          imports.add("import { generateText } from 'ai';");
          const modelId = (config.aiModel as string) || "gpt-4o-mini";
          const provider =
            modelId.startsWith("gpt-") || modelId.startsWith("o1-")
              ? "openai"
              : "anthropic";
          const aiPrompt = (config.aiPrompt as string) || "";
          const convertedPrompt = convertTemplateToJS(aiPrompt);

          stepBody = `  // Use template literal with dynamic values from outputs
  const aiPrompt = \`${escapeForTemplateLiteral(convertedPrompt)}\`;
  const finalPrompt = (input.aiPrompt as string) || aiPrompt;
  
  const { text } = await generateText({
    model: '${provider}/${modelId}',
    prompt: finalPrompt,
  });
  
  console.log('Text generated:', text);
  return { text };`;
        } else if (actionType === "Generate Image") {
          imports.add("import OpenAI from 'openai';");
          const imagePrompt = (config.imagePrompt as string) || "";
          const convertedImagePrompt = convertTemplateToJS(imagePrompt);

          stepBody = `  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Use template literal with dynamic values from outputs
  const imagePrompt = \`${escapeForTemplateLiteral(convertedImagePrompt)}\`;
  const finalPrompt = (input.imagePrompt as string) || imagePrompt;
  
  const response = await openai.images.generate({
    model: '${config.imageModel || "dall-e-3"}',
    prompt: finalPrompt,
    n: 1,
    response_format: 'b64_json',
  });
  
  console.log('Image generated');
  return { base64: response.data[0].b64_json };`;
        } else if (actionType === "Database Query") {
          const dbQuery = (config.dbQuery as string) || "SELECT 1";
          const convertedQuery = convertTemplateToJS(dbQuery);

          stepBody = `  // Database Query - You need to set up your database connection
  // Install: pnpm add postgres (or your preferred database library)
  // Set DATABASE_URL in your environment variables
  
  // Use template literal with dynamic values from outputs
  const query = \`${escapeForTemplateLiteral(convertedQuery)}\`;
  const finalQuery = (input.dbQuery as string) || query;
  
  // Example using postgres library:
  // import postgres from 'postgres';
  // const sql = postgres(process.env.DATABASE_URL!);
  // const result = await sql.unsafe(finalQuery);
  // await sql.end();
  
  console.log('Database query:', finalQuery);
  throw new Error('Database Query not implemented - see comments in generated code');`;
        } else if (actionType === "HTTP Request") {
          // Parse headers if provided
          let headersCode = "'Content-Type': 'application/json'";
          if (config.httpHeaders) {
            try {
              const headers =
                typeof config.httpHeaders === "string"
                  ? JSON.parse(config.httpHeaders as string)
                  : config.httpHeaders;
              const headerEntries = Object.entries(
                headers as Record<string, string>
              )
                .map(([key, value]) => `'${key}': '${value}'`)
                .join(",\n      ");
              if (headerEntries) {
                headersCode = headerEntries;
              }
            } catch {
              // If parsing fails, use default
              headersCode = "'Content-Type': 'application/json'";
            }
          }

          stepBody = `  const response = await fetch('${config.endpoint || "https://api.example.com"}', {
    method: '${config.httpMethod || "POST"}',
    headers: {
      ${headersCode}
    },
    body: JSON.stringify(input),
  });
  
  const data = await response.json();
  console.log('HTTP request completed:', data);
  return data;`;
        } else {
          stepBody = `  console.log('Executing ${node.data.label}');
  return { success: true };`;
        }
        break;

      case "transform":
        stepBody = `  console.log('Transforming data');
  return {
    ...input,
    transformed: true,
    timestamp: Date.now(),
  };`;
        break;

      default:
        stepBody = `  console.log('Executing ${node.data.label}');
  return input;`;
    }

    return `async function ${stepName}(input: Record<string, unknown> & { outputs?: Record<string, { label: string; data: unknown }> }) {
  "use step";
  
${stepBody}
}`;
  }

  // Generate all step functions with unique names
  const stepNameCounts = new Map<string, number>();
  const nodeToStepName = new Map<string, string>();

  for (const node of nodes) {
    if (node.data.type === "action" || node.data.type === "transform") {
      const config = node.data.config || {};
      const actionType = config.actionType as string;
      const baseLabel = node.data.label || actionType || "UnnamedStep";
      const baseName = sanitizeStepName(baseLabel);

      // Track how many times we've seen this base name
      const count = stepNameCounts.get(baseName) || 0;
      stepNameCounts.set(baseName, count + 1);

      // Append number if we've seen this name before
      const uniqueName = count > 0 ? `${baseName}${count + 1}` : baseName;

      // Store mapping for later use in workflow body generation
      nodeToStepName.set(node.id, uniqueName);

      stepFunctions.push(generateStepFunction(node, uniqueName));
    }
  }

  // Generate main workflow function
  function generateWorkflowBody(
    nodeId: string,
    indent = "  ",
    visitedLocal: Set<string> = new Set()
  ): string[] {
    if (visitedLocal.has(nodeId)) {
      return [];
    }

    visitedLocal.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    const lines: string[] = [];
    const varName = `result_${sanitizeVarName(node.id)}`;

    switch (node.data.type) {
      case "trigger":
        lines.push(`${indent}// Triggered`);
        lines.push(`${indent}let ${varName} = input;`);
        lines.push(
          `${indent}outputs['${sanitizeVarName(node.id)}'] = { label: '${node.data.label}', data: ${varName} };`
        );
        break;

      case "action":
      case "transform": {
        const nodeConfig = node.data.config || {};
        const nodeActionType = nodeConfig.actionType as string;
        const nodeLabel = node.data.label || nodeActionType || "UnnamedStep";
        const stepFnName =
          nodeToStepName.get(nodeId) || sanitizeStepName(nodeLabel);
        lines.push(`${indent}// ${nodeLabel}`);
        lines.push(
          `${indent}const ${varName} = await ${stepFnName}({ ...input, outputs });`
        );
        lines.push(
          `${indent}outputs['${sanitizeVarName(node.id)}'] = { label: '${nodeLabel}', data: ${varName} };`
        );
        break;
      }

      case "condition": {
        const condition = (node.data.config?.condition as string) || "true";
        const convertedCondition = convertTemplateToJS(condition);
        const nextNodes = edgesBySource.get(nodeId) || [];
        const conditionVarName = `conditionValue_${sanitizeVarName(node.id)}`;

        if (nextNodes.length > 0) {
          lines.push(`${indent}// ${node.data.label}`);

          // Use template literal to evaluate condition with dynamic values
          // Then convert to boolean
          lines.push(
            `${indent}const ${conditionVarName} = \`${escapeForTemplateLiteral(convertedCondition)}\`;`
          );
          lines.push(`${indent}if (${conditionVarName}) {`);

          if (nextNodes[0]) {
            lines.push(
              ...generateWorkflowBody(nextNodes[0], `${indent}  `, visitedLocal)
            );
          }

          if (nextNodes[1]) {
            lines.push(`${indent}} else {`);
            lines.push(
              ...generateWorkflowBody(nextNodes[1], `${indent}  `, visitedLocal)
            );
          }

          lines.push(`${indent}}`);
          return lines;
        }
        break;
      }
    }

    // Process next nodes (unless it's a condition)
    if (node.data.type !== "condition") {
      const nextNodes = edgesBySource.get(nodeId) || [];
      for (const nextNodeId of nextNodes) {
        lines.push(...generateWorkflowBody(nextNodeId, indent, visitedLocal));
      }
    }

    return lines;
  }

  const workflowBody: string[] = [];

  if (triggerNodes.length === 0) {
    workflowBody.push('  console.log("No trigger nodes found");');
    workflowBody.push('  return { error: "No trigger nodes" };');
  } else {
    // Initialize outputs tracking
    workflowBody.push(
      "  // Track outputs from each node for template processing"
    );
    workflowBody.push(
      "  const outputs: Record<string, { label: string; data: unknown }> = {};"
    );
    workflowBody.push("");

    for (const trigger of triggerNodes) {
      workflowBody.push(...generateWorkflowBody(trigger.id));
    }

    // Find the last node to return its result
    const lastNode = nodes.at(-1);
    if (lastNode) {
      const lastVarName = `result_${sanitizeVarName(lastNode.id)}`;
      workflowBody.push("");
      workflowBody.push(`  return ${lastVarName};`);
    }
  }

  const functionName = sanitizeFunctionName(workflowName);

  const mainFunction = `export async function ${functionName}(input: Record<string, unknown>) {
  "use workflow";
  
${workflowBody.join("\n")}
}`;

  // Combine everything
  const code = `${Array.from(imports).join("\n")}

${stepFunctions.join("\n\n")}

${mainFunction}
`;

  return code;
}

function sanitizeFunctionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^[0-9]/, "_$&")
    .replace(/_+/g, "_");
}

function sanitizeStepName(name: string): string {
  // Create a more readable function name from the label
  // e.g., "Find Issues" -> "findIssuesStep", "Generate Email Text" -> "generateEmailTextStep"
  const result = name
    .split(/\s+/) // Split by whitespace
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
  const sanitized = result.replace(/^[0-9]/, "_$&");

  // Add "Step" suffix to avoid conflicts with imports (e.g., generateText from 'ai')
  return `${sanitized}Step`;
}

function sanitizeVarName(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}
