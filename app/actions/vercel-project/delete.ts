"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

/**
 * Delete a project
 */
export async function deleteVercelProject(id: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(projects)
    .where(
      and(eq(projects.id, id), eq(projects.userId, session.user.id))
    );
}
