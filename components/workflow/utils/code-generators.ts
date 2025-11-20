/**
 * Code generation utilities for workflow step functions
 */

import conditionTemplate from "@/lib/codegen-templates/condition";
import createTicketTemplate from "@/lib/codegen-templates/create-ticket";
import databaseQueryTemplate from "@/lib/codegen-templates/database-query";
import generateImageTemplate from "@/lib/codegen-templates/generate-image";
import generateTextTemplate from "@/lib/codegen-templates/generate-text";
import httpRequestTemplate from "@/lib/codegen-templates/http-request";
import sendEmailTemplate from "@/lib/codegen-templates/send-email";
import sendSlackMessageTemplate from "@/lib/codegen-templates/send-slack-message";

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

    // Map action types to templates
    switch (actionType) {
      case "Send Email":
        return sendEmailTemplate;
      case "Send Slack Message":
        return sendSlackMessageTemplate;
      case "Create Ticket":
      case "Create Linear Issue":
        return createTicketTemplate;
      case "Generate Text":
        return generateTextTemplate;
      case "Generate Image":
        return generateImageTemplate;
      case "Database Query":
        return databaseQueryTemplate;
      case "HTTP Request":
        return httpRequestTemplate;
      case "Condition":
        return conditionTemplate;
      default:
        return `async function actionStep(input: Record<string, unknown>) {
  "use step";
  
  console.log('Executing action');
  return { success: true };
}`;
    }
  }

  return `async function unknownStep(input: Record<string, unknown>) {
  "use step";

  return input;
}`;
};
