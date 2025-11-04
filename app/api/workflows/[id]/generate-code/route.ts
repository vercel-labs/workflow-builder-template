import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { generateWorkflowModule } from "@/lib/workflow-codegen";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await params;

    // Fetch the workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check if user owns this workflow
    if (workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate code
    const functionName = workflow.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const code = generateWorkflowModule(
      workflow.name,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      {
        functionName,
        parameters: [{ name: "input", type: "Record<string, unknown>" }],
        returnType: "Promise<unknown>",
      }
    );

    return NextResponse.json({
      code,
      functionName,
      workflowName: workflow.name,
    });
  } catch (error) {
    console.error("Code generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate code",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const body = await request.json();
    const { functionName, parameters, returnType } = body;

    // Fetch the workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check if user owns this workflow
    if (workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate code with custom options
    const code = generateWorkflowModule(
      workflow.name,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      {
        functionName,
        parameters,
        returnType,
      }
    );

    return NextResponse.json({
      code,
      functionName,
      workflowName: workflow.name,
    });
  } catch (error) {
    console.error("Code generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate code",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
