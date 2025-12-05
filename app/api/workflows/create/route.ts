import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflows } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";

// Helper function to create a default trigger node
function createDefaultTriggerNode() {
  return {
    id: nanoid(),
    type: "trigger" as const,
    position: { x: 0, y: 0 },
    data: {
      label: "",
      description: "",
      type: "trigger" as const,
      config: { triggerType: "Manual" },
      status: "idle" as const,
    },
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!(body.name && body.nodes && body.edges)) {
      return NextResponse.json(
        { error: "Name, nodes, and edges are required" },
        { status: 400 }
      );
    }

    // Validate that all integrationIds in nodes belong to the current user
    const validation = await validateWorkflowIntegrations(
      body.nodes,
      session.user.id
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid integration references in workflow" },
        { status: 403 }
      );
    }

    // Ensure there's always a trigger node (only add one if nodes array is empty)
    let nodes = body.nodes;
    if (nodes.length === 0) {
      nodes = [createDefaultTriggerNode()];
    }

    // Generate "Untitled N" name if the provided name is "Untitled Workflow"
    let workflowName = body.name;
    if (body.name === "Untitled Workflow") {
      const userWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.userId, session.user.id),
      });
      const count = userWorkflows.length + 1;
      workflowName = `Untitled ${count}`;
    }

    // Generate workflow ID first
    const workflowId = generateId();

    const [newWorkflow] = await db
      .insert(workflows)
      .values({
        id: workflowId,
        name: workflowName,
        description: body.description,
        nodes,
        edges: body.edges,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({
      ...newWorkflow,
      createdAt: newWorkflow.createdAt.toISOString(),
      updatedAt: newWorkflow.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create workflow",
      },
      { status: 500 }
    );
  }
}
