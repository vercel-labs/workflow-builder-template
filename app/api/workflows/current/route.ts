import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";

const CURRENT_WORKFLOW_NAME = "~~__CURRENT__~~";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentWorkflow] = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.name, CURRENT_WORKFLOW_NAME),
          eq(workflows.userId, session.user.id)
        )
      )
      .orderBy(desc(workflows.updatedAt))
      .limit(1);

    if (!currentWorkflow) {
      // Return empty workflow if no current state exists
      return NextResponse.json({
        nodes: [],
        edges: [],
      });
    }

    return NextResponse.json({
      id: currentWorkflow.id,
      nodes: currentWorkflow.nodes,
      edges: currentWorkflow.edges,
    });
  } catch (error) {
    console.error("Failed to get current workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get current workflow",
      },
      { status: 500 }
    );
  }
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
    const { nodes, edges } = body;

    if (!(nodes && edges)) {
      return NextResponse.json(
        { error: "Nodes and edges are required" },
        { status: 400 }
      );
    }

    // Check if current workflow exists
    const [existingWorkflow] = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.name, CURRENT_WORKFLOW_NAME),
          eq(workflows.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingWorkflow) {
      // Update existing current workflow
      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          nodes,
          edges,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, existingWorkflow.id))
        .returning();

      return NextResponse.json({
        id: updatedWorkflow.id,
        nodes: updatedWorkflow.nodes,
        edges: updatedWorkflow.edges,
      });
    }

    // Create new current workflow
    const workflowId = generateId();

    const [savedWorkflow] = await db
      .insert(workflows)
      .values({
        id: workflowId,
        name: CURRENT_WORKFLOW_NAME,
        description: "Auto-saved current workflow",
        nodes,
        edges,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({
      id: savedWorkflow.id,
      nodes: savedWorkflow.nodes,
      edges: savedWorkflow.edges,
    });
  } catch (error) {
    console.error("Failed to save current workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save current workflow",
      },
      { status: 500 }
    );
  }
}
