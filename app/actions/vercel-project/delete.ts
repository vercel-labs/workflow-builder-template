"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vercelProjects } from "@/lib/db/schema";

/**
 * Delete a Vercel project
 */
export async function deleteVercelProject(id: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(vercelProjects)
    .where(
      and(
        eq(vercelProjects.id, id),
        eq(vercelProjects.userId, session.user.id)
      )
    );
}
