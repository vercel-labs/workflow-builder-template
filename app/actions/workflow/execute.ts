"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";
import { executeWorkflowServer } from "@/lib/workflow-executor.server";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Execute a workflow
 */
export async function execute(
  id: string,
  input: Record<string, unknown> = {}
): Promise<{
  executionId: string;
  status: string;
  output?: unknown;
  error?: string;
  duration: number;
}> {
  const session = await getSession();
  const workflow = await verifyWorkflowOwnership(id, session.user.id);

  // Create execution record
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: id,
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
        workflowId: id,
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

    return {
      executionId: execution.id,
      status: lastResult?.success ? "success" : "error",
      output: lastResult?.data,
      error: lastResult?.error,
      duration,
    };
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

    throw new Error(
      error instanceof Error ? error.message : "Failed to execute workflow"
    );
  }
}
