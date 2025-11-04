import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const source = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.id, id),
        eq(dataSources.userId, session.user.id)
      ),
    });

    if (!source) {
      return NextResponse.json(
        { error: "Data source not found" },
        { status: 404 }
      );
    }

    await db.delete(dataSources).where(eq(dataSources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete data source:", error);
    return NextResponse.json(
      {
        error: "Failed to delete data source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const source = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.id, id),
        eq(dataSources.userId, session.user.id)
      ),
    });

    if (!source) {
      return NextResponse.json(
        { error: "Data source not found" },
        { status: 404 }
      );
    }

    const updates: {
      name?: string;
      connectionString?: string;
      isDefault?: boolean;
    } = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.connectionString !== undefined)
      updates.connectionString = body.connectionString;
    if (body.isDefault !== undefined) {
      updates.isDefault = body.isDefault;

      // If setting as default, unset other defaults
      if (body.isDefault) {
        await db
          .update(dataSources)
          .set({ isDefault: false })
          .where(eq(dataSources.userId, session.user.id));
      }
    }

    const [updated] = await db
      .update(dataSources)
      .set(updates)
      .where(eq(dataSources.id, id))
      .returning();

    return NextResponse.json({ success: true, dataSource: updated });
  } catch (error) {
    console.error("Failed to update data source:", error);
    return NextResponse.json(
      {
        error: "Failed to update data source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
