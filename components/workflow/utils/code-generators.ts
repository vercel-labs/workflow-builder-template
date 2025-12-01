/**
 * Code generation utilities for workflow step functions
 */

import { AUTO_GENERATED_TEMPLATES } from "@/lib/codegen-registry";
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

const FALLBACK_ACTION_CODE = `async function actionStep(input: Record<string, unknown>) {
  "use step";

  console.log('Executing action');
  return { success: true };
}`;

const FALLBACK_UNKNOWN_CODE = `async function unknownStep(input: Record<string, unknown>) {
  "use step";

  return input;
}`;

type NodeConfig = Record<string, unknown>;

function generateTriggerCode(config: NodeConfig | undefined): string {
  const triggerType = (config?.triggerType as string) || "Manual";

  if (triggerType === "Schedule") {
    const cron = (config?.scheduleCron as string) || "0 9 * * *";
    const timezone = (config?.scheduleTimezone as string) || "America/New_York";
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

  return "";
}

function generateActionCode(actionType: string | undefined): string {
  if (!actionType) {
    return FALLBACK_ACTION_CODE;
  }

  // Check system actions first
  if (SYSTEM_ACTION_TEMPLATES[actionType]) {
    return SYSTEM_ACTION_TEMPLATES[actionType];
  }

  // Look up plugin actions in registry
  const action = findActionById(actionType);
  if (action) {
    // Prefer auto-generated templates, fall back to manual templates
    return (
      AUTO_GENERATED_TEMPLATES[action.id] ||
      action.codegenTemplate ||
      FALLBACK_ACTION_CODE
    );
  }

  return FALLBACK_ACTION_CODE;
}

// Generate code snippet for a single node
export const generateNodeCode = (node: {
  id: string;
  data: {
    type: string;
    label: string;
    description?: string;
    config?: NodeConfig;
  };
}): string => {
  if (node.data.type === "trigger") {
    return generateTriggerCode(node.data.config);
  }

  if (node.data.type === "action") {
    return generateActionCode(node.data.config?.actionType as string);
  }

  return FALLBACK_UNKNOWN_CODE;
};
