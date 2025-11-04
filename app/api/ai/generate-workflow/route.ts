import { streamText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { prompt } = await req.json();

    const result = streamText({
      model: process.env.AI_MODEL || "openai/gpt-4o-mini",
      system: `You are a workflow automation expert. Generate a workflow based on the user's description.
          
Return a JSON object with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "unique-id",
      "type": "trigger|action|condition|transform",
      "position": { "x": number, "y": number },
      "data": {
        "label": "Node Label",
        "description": "Node description",
        "type": "trigger|action|condition|transform",
        "config": { /* type-specific config */ },
        "status": "idle"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "type": "default"
    }
  ]
}

Node types and their configs:

TRIGGER NODES:
- Manual: { triggerType: "Manual" }
- Webhook: { triggerType: "Webhook", webhookPath: "/webhooks/name", webhookMethod: "POST" }
- Schedule: { triggerType: "Schedule", scheduleCron: "0 9 * * *", scheduleTimezone: "America/New_York" }
- Database Event: { triggerType: "Database Event", dbEventTable: "table_name", dbEventType: "INSERT" }

ACTION NODES:
- Send Email: { actionType: "Send Email", emailTo: "user@example.com", emailSubject: "Subject", emailBody: "Body text" }
- Send Slack Message: { actionType: "Send Slack Message", slackChannel: "#general", slackMessage: "Message text" }
- Create Ticket: { actionType: "Create Ticket", ticketTitle: "Title", ticketDescription: "Description", ticketPriority: "2" }
- Database Query: { actionType: "Database Query", dbQuery: "SELECT * FROM users WHERE status = 'active'", dbTable: "users" }
- HTTP Request: { actionType: "HTTP Request", httpMethod: "POST", endpoint: "https://api.example.com/endpoint", httpHeaders: "{}", httpBody: "{}" }

CONDITION NODES:
- { condition: "status === 'active'" }

TRANSFORM NODES:
- { transformType: "Map Data" }

IMPORTANT: 
- For Database Query actions, ALWAYS include a realistic SQL query in the "dbQuery" field
- For HTTP Request actions, include proper httpMethod, endpoint, httpHeaders, and httpBody
- For Send Email actions, include emailTo, emailSubject, and emailBody
- For Send Slack Message actions, include slackChannel and slackMessage
- Position nodes in a left-to-right flow with proper spacing (x: 100, 400, 700, etc., y: 200)
- Return ONLY valid JSON, no markdown or explanations`,
      prompt,
      temperature: 0.7,
    });

    // Convert stream to text
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    const workflowData = JSON.parse(fullText);
    return NextResponse.json(workflowData);
  } catch (error) {
    console.error("Failed to generate workflow:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate workflow",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
