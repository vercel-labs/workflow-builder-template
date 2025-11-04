import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await db.query.dataSources.findMany({
      where: eq(dataSources.userId, session.user.id),
    });

    // Mask connection strings for security
    const maskedSources = sources.map((source) => ({
      ...source,
      connectionString: maskConnectionString(source.connectionString),
    }));

    return NextResponse.json({ dataSources: maskedSources });
  } catch (error) {
    console.error("Failed to fetch data sources:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data sources",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, connectionString, isDefault } = body;

    if (!(name && type && connectionString)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(dataSources)
        .set({ isDefault: false })
        .where(eq(dataSources.userId, session.user.id));
    }

    const [newSource] = await db
      .insert(dataSources)
      .values({
        userId: session.user.id,
        name,
        type,
        connectionString,
        isDefault,
      })
      .returning();

    return NextResponse.json({
      ...newSource,
      connectionString: maskConnectionString(newSource.connectionString),
    });
  } catch (error) {
    console.error("Failed to create data source:", error);
    return NextResponse.json(
      {
        error: "Failed to create data source",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function maskConnectionString(connStr: string): string {
  // Mask password in connection string
  try {
    const url = new URL(connStr);
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    // If not a valid URL, just mask the middle part
    if (connStr.length <= 10) return connStr;
    return connStr.slice(0, 5) + "****" + connStr.slice(-5);
  }
}
