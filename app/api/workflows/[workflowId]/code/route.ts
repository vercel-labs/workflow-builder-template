import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { generateWorkflowSDKCode } from "@/lib/workflow-codegen-sdk";

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Generate code
    const code = generateWorkflowSDKCode(
      workflow.name,
      workflow.nodes,
      workflow.edges
    );

    return NextResponse.json({
      code,
      workflowName: workflow.name,
    });
  } catch (error) {
    return apiError(error, "Failed to get workflow code");
  }
}
