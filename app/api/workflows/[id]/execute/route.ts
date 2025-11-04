import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflowServer } from "@/lib/workflow-executor.server";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

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
    const { input = {} } = body;

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

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId: session.user.id,
        status: "running",
        input,
      })
      .returning();

    // Execute the workflow
    try {
      const startTime = Date.now();

      const results = await executeWorkflowServer(
        workflow.nodes as WorkflowNode[],
        workflow.edges as WorkflowEdge[],
        {
          executionId: execution.id,
          userId: session.user.id,
          input,
        }
      );

      const duration = Date.now() - startTime;

      // Get the last result
      const resultsArray = Array.from(results.values());
      const lastResult = resultsArray[resultsArray.length - 1];

      // Update execution record
      await db
        .update(workflowExecutions)
        .set({
          status: lastResult?.success ? "success" : "error",
          output: lastResult?.data,
          error: lastResult?.error,
          completedAt: new Date(),
          duration: duration.toString(),
        })
        .where(eq(workflowExecutions.id, execution.id));

      return NextResponse.json({
        executionId: execution.id,
        status: lastResult?.success ? "success" : "error",
        output: lastResult?.data,
        error: lastResult?.error,
        duration,
      });
    } catch (error) {
      // Update execution record with error
      await db
        .update(workflowExecutions)
        .set({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, execution.id));

      throw error;
    }
  } catch (error) {
    console.error("Workflow execution error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute workflow",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
