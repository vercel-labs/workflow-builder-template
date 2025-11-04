import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workflow deployment status
    const workflow = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
      columns: {
        id: true,
        name: true,
        deploymentStatus: true,
        deploymentUrl: true,
        lastDeployedAt: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      deploymentStatus: workflow.deploymentStatus || "none",
      deploymentUrl: workflow.deploymentUrl,
      lastDeployedAt: workflow.lastDeployedAt,
    });
  } catch (error) {
    console.error("Error fetching deployment status:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch deployment status",
      },
      { status: 500 }
    );
  }
}
