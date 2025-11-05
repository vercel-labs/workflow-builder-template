"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";

/**
 * Update a data source
 */
export async function update(
  id: string,
  data: {
    name?: string;
    connectionString?: string;
    isDefault?: boolean;
  }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const source = await db.query.dataSources.findFirst({
    where: and(eq(dataSources.id, id), eq(dataSources.userId, session.user.id)),
  });

  if (!source) {
    throw new Error("Data source not found");
  }

  const updates: {
    name?: string;
    connectionString?: string;
    isDefault?: boolean;
  } = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.connectionString !== undefined) {
    updates.connectionString = data.connectionString;
  }

  if (data.isDefault !== undefined) {
    updates.isDefault = data.isDefault;

    // If setting as default, unset other defaults
    if (data.isDefault) {
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

  return updated;
}
