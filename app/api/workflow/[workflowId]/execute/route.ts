import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflowServer } from "@/lib/workflow-executor.server";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;

    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workflow and verify ownership
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const input = body.input || {};

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

    // Return immediately with the execution ID
    const response = NextResponse.json({
      executionId: execution.id,
      status: "running",
    });

    // Execute the workflow in the background (don't await)
    (async () => {
      try {
        const startTime = Date.now();

        const results = await executeWorkflowServer(
          workflow.nodes as WorkflowNode[],
          workflow.edges as WorkflowEdge[],
          {
            executionId: execution.id,
            userId: session.user.id,
            workflowId,
            input,
          }
        );

        const duration = Date.now() - startTime;

        // Get the last result
        const resultsArray = Array.from(results.values());
        const lastResult = resultsArray.at(-1);

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
      }
    })();

    return response;
  } catch (error) {
    console.error("Failed to start workflow execution:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      },
      { status: 500 }
    );
  }
}
