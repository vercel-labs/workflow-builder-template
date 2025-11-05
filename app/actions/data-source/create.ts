"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";
import { maskConnectionString } from "./utils";

/**
 * Create a new data source
 */
export async function create(data: {
  name: string;
  type: string;
  connectionString: string;
  isDefault?: boolean;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!(data.name && data.type && data.connectionString)) {
    throw new Error("Missing required fields");
  }

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await db
      .update(dataSources)
      .set({ isDefault: false })
      .where(eq(dataSources.userId, session.user.id));
  }

  const [newSource] = await db
    .insert(dataSources)
    .values({
      userId: session.user.id,
      name: data.name,
      type: data.type,
      connectionString: data.connectionString,
      isDefault: data.isDefault,
    })
    .returning();

  return {
    ...newSource,
    connectionString: maskConnectionString(newSource.connectionString),
  };
}
