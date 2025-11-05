"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";

/**
 * Delete a data source
 */
export async function deleteDataSource(id: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership before deleting
  const source = await db.query.dataSources.findFirst({
    where: and(eq(dataSources.id, id), eq(dataSources.userId, session.user.id)),
  });

  if (!source) {
    throw new Error("Data source not found");
  }

  await db.delete(dataSources).where(eq(dataSources.id, id));
}
