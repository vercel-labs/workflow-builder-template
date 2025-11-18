/**
 * Code generation utilities for workflow step functions
 */

import {
  getAiImageInputType,
  getAiTextInputType,
  getConditionInputType,
  getDatabaseInputType,
  getEmailInputType,
  getExecuteCodeInputType,
  getFindIssuesInputType,
  getLinearInputType,
  getSlackInputType,
  getTicketInputType,
} from "./input-types";

// Regex constants
export const WORD_SPLIT_REGEX = /\s+/;
export const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9\s]/g;

// Generate email action code
export const generateEmailActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Send email");
  lines.push("  const result = await sendEmail({");
  lines.push("    to: input.to,");
  lines.push("    subject: input.subject,");
  lines.push("    body: input.body,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Generate Slack action code
export const generateSlackActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Send Slack message");
  lines.push("  const result = await sendSlackMessage({");
  lines.push("    channel: input.channel,");
  lines.push("    text: input.text,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Generate database action code
export const generateDatabaseActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Execute database query");
  lines.push("  const result = await executeQuery({");
  lines.push("    query: input.query,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Generate AI text action code
export const generateAiTextActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Generate text or object using AI");
  lines.push("  const format = input.format || 'text';");
  lines.push("");
  lines.push("  if (format === 'object') {");
  lines.push("    const result = await generateObject({");
  lines.push("      model: input.model,");
  lines.push("      prompt: input.prompt,");
  lines.push("      schema: input.schema,");
  lines.push("    });");
  lines.push("    return result;");
  lines.push("  }");
  lines.push("");
  lines.push("  const result = await generateText({");
  lines.push("    model: input.model,");
  lines.push("    prompt: input.prompt,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Generate AI image action code
export const generateAiImageActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Generate image using AI");
  lines.push("  const result = await generateImage({");
  lines.push("    model: input.model,");
  lines.push("    prompt: input.prompt,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Generate ticket action code
export const generateTicketActionCode = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Create ticket");
  lines.push("  const result = await createTicket({");
  lines.push("    title: input.title,");
  lines.push("    description: input.description,");
  lines.push("    priority: 2,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Handle linear issue action
export const handleLinearAction = (lines: string[]) => {
  lines.push("  // Create Linear issue");
  lines.push("  const result = await createLinearIssue({");
  lines.push("    title: input.title,");
  lines.push("    description: input.description,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Handle execute code action
export const handleExecuteCodeAction = (
  config: Record<string, unknown>,
  lines: string[]
) => {
  const codeLanguage = (config?.codeLanguage as string) || "javascript";
  lines.push(`  // Execute ${codeLanguage} code`);
  lines.push("  const result = await executeCode({");
  lines.push(`    language: "${codeLanguage}",`);
  lines.push("    code: input.code,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Handle find issues action
export const handleFindIssuesAction = (lines: string[]) => {
  lines.push("  // Find issues");
  lines.push("  const result = await findIssues({");
  lines.push("    assigneeId: input.assigneeId,");
  lines.push("    status: input.status,");
  lines.push("  });");
  lines.push("");
  lines.push("  return result;");
};

// Handle condition action
export const handleConditionAction = (
  _config: Record<string, unknown>,
  lines: string[]
) => {
  lines.push("  // Evaluate condition");
  lines.push("  const result = input.condition;");
  lines.push("");
  lines.push("  return { condition: result };");
};

// Handle generic HTTP request action
export const handleGenericHttpAction = (endpoint: string, lines: string[]) => {
  lines.push(`  const response = await fetch('${endpoint}', {`);
  lines.push(`    method: 'POST',`);
  lines.push("    headers: {");
  lines.push(`      'Content-Type': 'application/json'`);
  lines.push("    },");
  lines.push("    body: JSON.stringify(input),");
  lines.push("  });");
  lines.push("");
  lines.push("  const data = await response.json();");
  lines.push(`  console.log('HTTP request completed:', data);`);
  lines.push("  return data;");
};

// Helper to check if action matches type
export const matchesActionType = (
  actionType: string,
  label: string,
  ...keywords: string[]
): boolean =>
  keywords.some(
    (keyword) =>
      actionType === keyword ||
      label.toLowerCase().includes(keyword.toLowerCase())
  );

// Handle action type logic
export const generateActionCode = ({
  actionType,
  label,
  config,
  endpoint,
  lines,
}: {
  actionType: string;
  label: string;
  config: Record<string, unknown>;
  endpoint: string;
  lines: string[];
}) => {
  // Check more specific action types first to avoid substring matches
  if (matchesActionType(actionType, label, "Generate Text", "generate text")) {
    generateAiTextActionCode(config, lines);
  } else if (
    matchesActionType(actionType, label, "Generate Image", "generate image")
  ) {
    generateAiImageActionCode(config, lines);
  } else if (
    matchesActionType(actionType, label, "Execute Code", "execute code")
  ) {
    handleExecuteCodeAction(config, lines);
  } else if (matchesActionType(actionType, label, "Send Email", "email")) {
    generateEmailActionCode(config, lines);
  } else if (
    matchesActionType(actionType, label, "Create Linear Issue", "linear")
  ) {
    handleLinearAction(lines);
  } else if (
    matchesActionType(actionType, label, "Send Slack Message", "slack")
  ) {
    generateSlackActionCode(config, lines);
  } else if (
    matchesActionType(actionType, label, "Database Query", "database")
  ) {
    generateDatabaseActionCode(config, lines);
  } else if (matchesActionType(actionType, label, "Create Ticket", "ticket")) {
    generateTicketActionCode(config, lines);
  } else if (
    matchesActionType(actionType, label, "Find Issues", "find issues")
  ) {
    handleFindIssuesAction(lines);
  } else if (matchesActionType(actionType, label, "Condition", "condition")) {
    handleConditionAction(config, lines);
  } else {
    handleGenericHttpAction(endpoint, lines);
  }
};

// Helper to get input type based on action type
export const getInputType = (
  actionType: string,
  config: Record<string, unknown>
): string => {
  if (matchesActionType(actionType, "", "Generate Text", "generate text")) {
    return getAiTextInputType();
  }
  if (matchesActionType(actionType, "", "Generate Image", "generate image")) {
    return getAiImageInputType();
  }
  if (matchesActionType(actionType, "", "Execute Code", "execute code")) {
    return getExecuteCodeInputType(config);
  }
  if (matchesActionType(actionType, "", "Send Email", "email")) {
    return getEmailInputType();
  }
  if (matchesActionType(actionType, "", "Create Linear Issue", "linear")) {
    return getLinearInputType();
  }
  if (matchesActionType(actionType, "", "Send Slack Message", "slack")) {
    return getSlackInputType();
  }
  if (matchesActionType(actionType, "", "Database Query", "database")) {
    return getDatabaseInputType();
  }
  if (matchesActionType(actionType, "", "Create Ticket", "ticket")) {
    return getTicketInputType();
  }
  if (matchesActionType(actionType, "", "Find Issues", "find issues")) {
    return getFindIssuesInputType();
  }
  if (matchesActionType(actionType, "", "Condition", "condition")) {
    return getConditionInputType();
  }

  return "Record<string, unknown>";
};

// Generate code snippet for a single node
export const generateNodeCode = (node: {
  id: string;
  data: {
    type: string;
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  };
}): string => {
  const lines: string[] = [];

  // Determine function name based on node type and action type
  let baseName = "generic";

  if (node.data.type === "trigger") {
    baseName = (node.data.config?.triggerType as string) || "trigger";
  } else if (node.data.type === "action") {
    const actionType = node.data.config?.actionType as string;
    baseName = actionType || node.data.label;
  }

  // Convert to camelCase function name
  const functionName = `${baseName
    .replace(NON_ALPHANUMERIC_REGEX, "")
    .split(WORD_SPLIT_REGEX)
    .map((word, i) => {
      if (i === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("")}Step`;

  // Get the appropriate input type
  const actionType = (node.data.config?.actionType as string) || "";
  const inputType =
    node.data.type === "action"
      ? getInputType(actionType, node.data.config || {})
      : "Record<string, unknown>";

  lines.push(`async function ${functionName}(input: ${inputType}) {`);
  lines.push("");
  lines.push(`  "use step";`);
  lines.push("");

  if (node.data.description) {
    lines.push(`  // ${node.data.description}`);
    lines.push("");
  }

  switch (node.data.type) {
    case "trigger":
      lines.push("  // Trigger setup");
      lines.push(`  console.log('Workflow triggered with input:', input);`);
      lines.push("  return input;");
      break;
    case "action": {
      const config = node.data.config || {};
      const label = node.data.label;
      const endpoint = config.endpoint as string;

      generateActionCode({
        actionType,
        label,
        config,
        endpoint,
        lines,
      });
      break;
    }
    default:
      lines.push("  // No-op");
      lines.push("  return input;");
  }

  lines.push("}");

  return lines.join("\n");
};
