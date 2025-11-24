import { streamText } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Simple type for operations
type Operation = {
  op:
    | "setName"
    | "setDescription"
    | "addNode"
    | "addEdge"
    | "removeNode"
    | "removeEdge"
    | "updateNode";
  name?: string;
  description?: string;
  node?: unknown;
  edge?: unknown;
  nodeId?: string;
  edgeId?: string;
  updates?: {
    position?: { x: number; y: number };
    data?: unknown;
  };
};

function encodeMessage(encoder: TextEncoder, message: object): Uint8Array {
  return encoder.encode(`${JSON.stringify(message)}\n`);
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || trimmed.startsWith("```");
}

function tryParseAndEnqueueOperation(
  line: string,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  operationCount: number
): number {
  const trimmed = line.trim();

  if (shouldSkipLine(line)) {
    return operationCount;
  }

  try {
    const operation = JSON.parse(trimmed) as Operation;
    const newCount = operationCount + 1;

    console.log(`[API] Operation ${newCount}:`, operation.op);

    controller.enqueue(
      encodeMessage(encoder, {
        type: "operation",
        operation,
      })
    );

    return newCount;
  } catch {
    console.warn("[API] Skipping invalid JSON line:", trimmed.substring(0, 50));
    return operationCount;
  }
}

function processBufferLines(
  buffer: string,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  operationCount: number
): { remainingBuffer: string; newOperationCount: number } {
  const lines = buffer.split("\n");
  const remainingBuffer = lines.pop() || "";
  let newOperationCount = operationCount;

  for (const line of lines) {
    newOperationCount = tryParseAndEnqueueOperation(
      line,
      encoder,
      controller,
      newOperationCount
    );
  }

  return { remainingBuffer, newOperationCount };
}

async function processOperationStream(
  textStream: AsyncIterable<string>,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<void> {
  let buffer = "";
  let operationCount = 0;
  let chunkCount = 0;

  for await (const chunk of textStream) {
    chunkCount += 1;
    buffer += chunk;

    const result = processBufferLines(
      buffer,
      encoder,
      controller,
      operationCount
    );
    buffer = result.remainingBuffer;
    operationCount = result.newOperationCount;
  }

  // Process any remaining buffer content
  operationCount = tryParseAndEnqueueOperation(
    buffer,
    encoder,
    controller,
    operationCount
  );

  console.log(
    `[API] Stream complete. Chunks: ${chunkCount}, Operations: ${operationCount}`
  );

  // Send completion
  controller.enqueue(
    encodeMessage(encoder, {
      type: "complete",
    })
  );
}

const system = `You are a workflow automation expert. Generate a workflow based on the user's description.

CRITICAL: Output your workflow as INDIVIDUAL OPERATIONS, one per line in JSONL format.
Each line must be a complete, separate JSON object.

Operations you can output:
1. {"op": "setName", "name": "Workflow Name"}
2. {"op": "setDescription", "description": "Brief description"}
3. {"op": "addNode", "node": {COMPLETE_NODE_OBJECT}}
4. {"op": "addEdge", "edge": {COMPLETE_EDGE_OBJECT}}
5. {"op": "removeNode", "nodeId": "node-id-to-remove"}
6. {"op": "removeEdge", "edgeId": "edge-id-to-remove"}
7. {"op": "updateNode", "nodeId": "node-id", "updates": {"position": {"x": 100, "y": 200}}}

IMPORTANT RULES:
- Every workflow must have EXACTLY ONE trigger node
- Output ONE operation per line
- Each line must be complete, valid JSON
- Start with setName and setDescription
- Then add nodes one at a time
- Finally add edges one at a time to CONNECT ALL NODES
- CRITICAL: Every node (except the last) MUST be connected to at least one other node
- To update node positions or properties, use updateNode operation
- NEVER output explanatory text - ONLY JSON operations
- Do NOT wrap in markdown code blocks
- Do NOT add explanatory text

Node structure:
{
  "id": "unique-id",
  "type": "trigger" or "action",
  "position": {"x": number, "y": number},
  "data": {
    "label": "Node Label",
    "description": "Node description",
    "type": "trigger" or "action",
    "config": {...},
    "status": "idle"
  }
}

Trigger types:
- Manual: {"triggerType": "Manual"}
- Webhook: {"triggerType": "Webhook", "webhookPath": "/webhooks/name", ...}
- Schedule: {"triggerType": "Schedule", "scheduleCron": "0 9 * * *", ...}

Action types:
- Send Email: {"actionType": "Send Email", "emailTo": "user@example.com", "emailSubject": "Subject", "emailBody": "Body"}
- Send Slack Message: {"actionType": "Send Slack Message", "slackChannel": "#general", "slackMessage": "Message"}
- Create Ticket: {"actionType": "Create Ticket", "ticketTitle": "Title", "ticketDescription": "Description", "ticketPriority": "2"}
- Database Query: {"actionType": "Database Query", "dbQuery": "SELECT * FROM table", "dbTable": "table"}
- HTTP Request: {"actionType": "HTTP Request", "httpMethod": "POST", "endpoint": "https://api.example.com", "httpHeaders": "{}", "httpBody": "{}"}
- Generate Text: {"actionType": "Generate Text", "aiModel": "gpt-5", "aiFormat": "text", "aiPrompt": "Your prompt here"}
- Generate Image: {"actionType": "Generate Image", "imageModel": "openai/dall-e-3", "imagePrompt": "Image description"}
- Condition: {"actionType": "Condition", "condition": "{{@nodeId:Label.field}} === 'value'"}

CRITICAL ABOUT CONDITION NODES:
- Condition nodes evaluate a boolean expression
- When TRUE: ALL connected nodes execute
- When FALSE: ALL connected nodes are SKIPPED
- For if/else logic, CREATE MULTIPLE SEPARATE condition nodes (one per branch)
- NEVER connect multiple different outcome paths to a single condition node
- Each condition should check for ONE specific case

Example: "if good send Slack, if bad create ticket" needs TWO conditions:
{"op": "addNode", "node": {"id": "cond-good", "data": {"config": {"condition": "{{@rate:Rate.value}} === 'good'"}}}}
{"op": "addNode", "node": {"id": "cond-bad", "data": {"config": {"condition": "{{@rate:Rate.value}} === 'bad'"}}}}
{"op": "addEdge", "edge": {"source": "rate", "target": "cond-good"}}
{"op": "addEdge", "edge": {"source": "rate", "target": "cond-bad"}}
{"op": "addEdge", "edge": {"source": "cond-good", "target": "slack"}}
{"op": "addEdge", "edge": {"source": "cond-bad", "target": "ticket"}}

Edge structure:
{
  "id": "edge-id",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "default"
}

WORKFLOW FLOW:
- Trigger connects to first action
- Actions connect in sequence or to multiple branches
- ALWAYS create edges to connect the workflow flow
- For linear workflows: trigger -> action1 -> action2 -> etc
- For branching (conditions): one source can connect to multiple targets

Example output:
{"op": "setName", "name": "Contact Form Workflow"}
{"op": "setDescription", "description": "Processes contact form submissions"}
{"op": "addNode", "node": {"id": "trigger-1", "type": "trigger", "position": {"x": 100, "y": 200}, "data": {"label": "Contact Form", "type": "trigger", "config": {"triggerType": "Manual"}, "status": "idle"}}}
{"op": "addNode", "node": {"id": "send-email", "type": "action", "position": {"x": 400, "y": 200}, "data": {"label": "Send Email", "type": "action", "config": {"actionType": "Send Email", "emailTo": "admin@example.com", "emailSubject": "New Contact", "emailBody": "New contact form submission"}, "status": "idle"}}}
{"op": "addEdge", "edge": {"id": "e1", "source": "trigger-1", "target": "send-email", "type": "default"}}

REMEMBER: After adding all nodes, you MUST add edges to connect them! Every node should be reachable from the trigger.`;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, existingWorkflow } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI API key not configured on server. Please contact support.",
        },
        { status: 500 }
      );
    }

    // Build the user prompt
    let userPrompt = prompt;
    if (existingWorkflow) {
      // Identify nodes and their labels for context
      const nodesList = (existingWorkflow.nodes || [])
        .map(
          (n: { id: string; data?: { label?: string } }) =>
            `- ${n.id} (${n.data?.label || "Unlabeled"})`
        )
        .join("\n");

      const edgesList = (existingWorkflow.edges || [])
        .map(
          (e: { id: string; source: string; target: string }) =>
            `- ${e.id}: ${e.source} -> ${e.target}`
        )
        .join("\n");

      userPrompt = `I have an existing workflow. I want you to make ONLY the changes I request.

Current workflow nodes:
${nodesList}

Current workflow edges:
${edgesList}

Full workflow data (DO NOT recreate these, they already exist):
${JSON.stringify(existingWorkflow, null, 2)}

User's request: ${prompt}

IMPORTANT: Output ONLY the operations needed to make the requested changes.
- If adding new nodes: output "addNode" operations for NEW nodes only, then IMMEDIATELY output "addEdge" operations to connect them to the workflow
- If adding new edges: output "addEdge" operations for NEW edges only  
- If removing nodes: output "removeNode" operations with the nodeId to remove
- If removing edges: output "removeEdge" operations with the edgeId to remove
- If changing name/description: output "setName"/"setDescription" only if changed
- CRITICAL: New nodes MUST be connected with edges - always add edges after adding nodes
- When connecting nodes, look at the node IDs in the current workflow list above
- DO NOT output operations for existing nodes/edges unless specifically modifying them
- Keep the existing workflow structure and only add/modify/remove what was requested

Example: If user says "connect node A to node B", output:
{"op": "addEdge", "edge": {"id": "e-new", "source": "A", "target": "B", "type": "default"}}`;
    }

    const result = streamText({
      model: "openai/gpt-5.1-instant",
      system,
      prompt: userPrompt,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await processOperationStream(result.textStream, encoder, controller);
          controller.close();
        } catch (error) {
          controller.enqueue(
            encodeMessage(encoder, {
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to generate workflow",
            })
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to generate workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate workflow",
      },
      { status: 500 }
    );
  }
}
