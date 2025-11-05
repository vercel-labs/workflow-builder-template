"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/**
 * Update the current user's account information
 */
export async function update(data: {
  name?: string;
  email?: string;
}): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const updates: { name?: string; email?: string } = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }
  if (data.email !== undefined) {
    updates.email = data.email;
  }

  await db.update(user).set(updates).where(eq(user.id, session.user.id));
}
