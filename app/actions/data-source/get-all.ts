"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataSources } from "@/lib/db/schema";
import { maskConnectionString } from "./utils";

/**
 * Get all data sources for the current user
 */
export async function getAll() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const sources = await db.query.dataSources.findMany({
    where: eq(dataSources.userId, session.user.id),
  });

  // Mask connection strings for security
  const maskedSources = sources.map((source) => ({
    ...source,
    connectionString: maskConnectionString(source.connectionString),
  }));

  return maskedSources;
}
