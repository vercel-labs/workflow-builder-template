/**
 * Code generation utilities for workflow step functions
 */

import conditionTemplate from "@/lib/codegen-templates/condition";
import databaseQueryTemplate from "@/lib/codegen-templates/database-query";
import httpRequestTemplate from "@/lib/codegen-templates/http-request";
import { generateImageCodegenTemplate } from "@/plugins/ai-gateway/codegen/generate-image";
import { generateTextCodegenTemplate } from "@/plugins/ai-gateway/codegen/generate-text";
import { scrapeCodegenTemplate } from "@/plugins/firecrawl/codegen/scrape";
import { searchCodegenTemplate } from "@/plugins/firecrawl/codegen/search";
import { createTicketCodegenTemplate } from "@/plugins/linear/codegen/create-ticket";
import { sendEmailCodegenTemplate } from "@/plugins/resend/codegen/send-email";
import { sendSlackMessageCodegenTemplate } from "@/plugins/slack/codegen/send-slack-message";
import { guardCodegenTemplate } from "@/plugins/superagent/codegen/guard";
import { redactCodegenTemplate } from "@/plugins/superagent/codegen/redact";

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
        return sendEmailCodegenTemplate;
      case "Send Slack Message":
        return sendSlackMessageCodegenTemplate;
      case "Create Ticket":
      case "Create Linear Issue":
        return createTicketCodegenTemplate;
      case "Generate Text":
        return generateTextCodegenTemplate;
      case "Generate Image":
        return generateImageCodegenTemplate;
      case "Database Query":
        return databaseQueryTemplate;
      case "HTTP Request":
        return httpRequestTemplate;
      case "Condition":
        return conditionTemplate;
      case "Scrape":
        return scrapeCodegenTemplate;
      case "Search":
        return searchCodegenTemplate;
      case "Guard":
        return guardCodegenTemplate;
      case "Redact":
        return redactCodegenTemplate;
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
