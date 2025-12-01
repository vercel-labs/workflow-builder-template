/**
 * Code generation utilities for workflow step functions
 */

import conditionTemplate from "@/lib/codegen-templates/condition";
import databaseQueryTemplate from "@/lib/codegen-templates/database-query";
import httpRequestTemplate from "@/lib/codegen-templates/http-request";
import { findActionById } from "@/plugins";

// System action templates (non-plugin actions)
const SYSTEM_ACTION_TEMPLATES: Record<string, string> = {
  "Database Query": databaseQueryTemplate,
  "HTTP Request": httpRequestTemplate,
  Condition: conditionTemplate,
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
  if (node.data.type === "trigger") {
    const triggerType = (node.data.config?.triggerType as string) || "Manual";

    if (triggerType === "Schedule") {
      const cron = (node.data.config?.scheduleCron as string) || "0 9 * * *";
      const timezone =
        (node.data.config?.scheduleTimezone as string) || "America/New_York";
      return `{
  "crons": [
    {
      "path": "/api/workflow",
      "schedule": "${cron}",
      "timezone": "${timezone}"
    }
  ]
}`;
    }

    if (triggerType === "Webhook") {
      return `import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Call your workflow function here
  await executeWorkflow(body);
  
  return Response.json({ success: true });
}`;
    }

    // Manual trigger - no code
    return "";
  }

  if (node.data.type === "action") {
    const actionType = node.data.config?.actionType as string;

    // Check system actions first
    if (SYSTEM_ACTION_TEMPLATES[actionType]) {
      return SYSTEM_ACTION_TEMPLATES[actionType];
    }

    // Look up plugin actions in registry
    const action = findActionById(actionType);
    if (action?.codegenTemplate) {
      return action.codegenTemplate;
    }

    // Fallback for unknown actions
    return `async function actionStep(input: Record<string, unknown>) {
  "use step";

  console.log('Executing action');
  return { success: true };
}`;
  }

  return `async function unknownStep(input: Record<string, unknown>) {
  "use step";

  return input;
}`;
};
