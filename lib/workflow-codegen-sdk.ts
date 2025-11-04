import 'server-only';

import type { WorkflowNode, WorkflowEdge } from './workflow-store';

/**
 * Escape a string for safe use in generated code
 * Handles newlines, quotes, backticks, and other special characters
 */
function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$') // Escape dollar signs (for template literals)
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
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
    (node) => node.data.type === 'trigger' && !nodesWithIncoming.has(node.id)
  );

  // Always import sleep and FatalError
  imports.add("import { sleep, FatalError } from 'workflow';");

  function generateStepFunction(node: WorkflowNode): string {
    const stepName = sanitizeStepName(node.data.label || node.id);
    const config = node.data.config || {};
    const actionType = config.actionType as string;

    let stepBody = '';

    switch (node.data.type) {
      case 'action':
        if (actionType === 'Send Email') {
          imports.add("import { Resend } from 'resend';");
          const escapedEmailTo = escapeString((config.emailTo as string) || 'user@example.com');
          const escapedSubject = escapeString((config.emailSubject as string) || 'Notification');
          const escapedBody = escapeString((config.emailBody as string) || 'No content');
          stepBody = `  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const result = await resend.emails.send({
    from: '${config.resendFromEmail || 'onboarding@resend.dev'}',
    to: \`\${input.emailTo || \`${escapedEmailTo}\`}\`,
    subject: \`\${input.emailSubject || \`${escapedSubject}\`}\`,
    text: \`\${input.emailBody || \`${escapedBody}\`}\`,
  });
  
  console.log('Email sent:', result);
  return result;`;
        } else if (actionType === 'Send Slack Message') {
          imports.add("import { WebClient } from '@slack/web-api';");
          const escapedSlackMessage = escapeString((config.slackMessage as string) || 'No message');
          stepBody = `  const slack = new WebClient(process.env.SLACK_API_KEY);
  
  const result = await slack.chat.postMessage({
    channel: '${config.slackChannel || '#general'}',
    text: \`\${input.slackMessage || \`${escapedSlackMessage}\`}\`,
  });
  
  console.log('Slack message sent:', result);
  return result;`;
        } else if (actionType === 'Create Ticket') {
          imports.add("import { LinearClient } from '@linear/sdk';");
          const escapedTitle = escapeString((config.ticketTitle as string) || 'New Issue');
          const escapedDescription = escapeString((config.ticketDescription as string) || '');
          stepBody = `  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  
  const issue = await linear.issueCreate({
    title: \`\${input.ticketTitle || \`${escapedTitle}\`}\`,
    description: \`\${input.ticketDescription || \`${escapedDescription}\`}\`,
    teamId: process.env.LINEAR_TEAM_ID!,
  });
  
  console.log('Linear issue created:', issue);
  return issue;`;
        } else if (actionType === 'Generate Text') {
          imports.add("import { generateText } from 'ai';");
          const modelId = (config.aiModel as string) || 'gpt-4o-mini';
          const provider =
            modelId.startsWith('gpt-') || modelId.startsWith('o1-') ? 'openai' : 'anthropic';
          const escapedPrompt = escapeString((config.aiPrompt as string) || '');
          stepBody = `  const { text } = await generateText({
    model: '${provider}/${modelId}',
    prompt: \`\${input.aiPrompt || \`${escapedPrompt}\`}\`,
  });
  
  console.log('Text generated:', text);
  return { text };`;
        } else if (actionType === 'Generate Image') {
          imports.add("import OpenAI from 'openai';");
          const escapedImagePrompt = escapeString((config.imagePrompt as string) || '');
          stepBody = `  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.images.generate({
    model: '${config.imageModel || 'dall-e-3'}',
    prompt: \`\${input.imagePrompt || \`${escapedImagePrompt}\`}\`,
    n: 1,
    response_format: 'b64_json',
  });
  
  console.log('Image generated');
  return { base64: response.data[0].b64_json };`;
        } else if (actionType === 'HTTP Request') {
          stepBody = `  const response = await fetch('${config.endpoint || 'https://api.example.com'}', {
    method: '${config.httpMethod || 'POST'}',
    headers: {
      'Content-Type': 'application/json',
      ${config.httpHeaders ? JSON.stringify(config.httpHeaders) : '{}'}
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

      case 'transform':
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

    return `async function ${stepName}(input: Record<string, unknown>) {
  "use step";
  
${stepBody}
}`;
  }

  // Generate all step functions
  for (const node of nodes) {
    if (node.data.type === 'action' || node.data.type === 'transform') {
      stepFunctions.push(generateStepFunction(node));
    }
  }

  // Generate main workflow function
  function generateWorkflowBody(
    nodeId: string,
    indent: string = '  ',
    visitedLocal: Set<string> = new Set()
  ): string[] {
    if (visitedLocal.has(nodeId)) {
      return [];
    }

    visitedLocal.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return [];

    const lines: string[] = [];
    const varName = `result_${sanitizeVarName(node.id)}`;

    switch (node.data.type) {
      case 'trigger':
        lines.push(`${indent}// Triggered`);
        lines.push(`${indent}let ${varName} = input;`);
        break;

      case 'action':
      case 'transform':
        const stepName = sanitizeStepName(node.data.label || node.id);
        lines.push(`${indent}// ${node.data.label}`);
        lines.push(`${indent}const ${varName} = await ${stepName}(input);`);
        break;

      case 'condition':
        const condition = (node.data.config?.condition as string) || 'true';
        const nextNodes = edgesBySource.get(nodeId) || [];

        if (nextNodes.length > 0) {
          lines.push(`${indent}// ${node.data.label}`);
          lines.push(`${indent}if (${condition}) {`);

          if (nextNodes[0]) {
            lines.push(...generateWorkflowBody(nextNodes[0], indent + '  ', visitedLocal));
          }

          if (nextNodes[1]) {
            lines.push(`${indent}} else {`);
            lines.push(...generateWorkflowBody(nextNodes[1], indent + '  ', visitedLocal));
          }

          lines.push(`${indent}}`);
          return lines;
        }
        break;
    }

    // Process next nodes (unless it's a condition)
    if (node.data.type !== 'condition') {
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
    for (const trigger of triggerNodes) {
      workflowBody.push(...generateWorkflowBody(trigger.id));
    }

    // Find the last node to return its result
    const lastNode = nodes[nodes.length - 1];
    const lastVarName = `result_${sanitizeVarName(lastNode.id)}`;
    workflowBody.push('');
    workflowBody.push(`  return ${lastVarName};`);
  }

  const functionName = sanitizeFunctionName(workflowName);

  const mainFunction = `export async function ${functionName}(input: Record<string, unknown>) {
  "use workflow";
  
${workflowBody.join('\n')}
}`;

  // Combine everything
  const code = `${Array.from(imports).join('\n')}

${stepFunctions.join('\n\n')}

${mainFunction}
`;

  return code;
}

function sanitizeFunctionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_');
}

function sanitizeStepName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function sanitizeVarName(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}
