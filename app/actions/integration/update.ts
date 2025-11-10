"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/**
 * Update user's integration settings (Vercel is now app-level, not user-level)
 */
export async function update(data: {
  resendApiKey?: string | null;
  resendFromEmail?: string | null;
  linearApiKey?: string | null;
  slackApiKey?: string | null;
}): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const updates: {
    resendApiKey?: string | null;
    resendFromEmail?: string | null;
    linearApiKey?: string | null;
    slackApiKey?: string | null;
  } = {};

  if (data.resendApiKey !== undefined) {
    updates.resendApiKey = data.resendApiKey || null;
  }

  if (data.resendFromEmail !== undefined) {
    updates.resendFromEmail = data.resendFromEmail || null;
  }

  if (data.linearApiKey !== undefined) {
    updates.linearApiKey = data.linearApiKey || null;
  }

  if (data.slackApiKey !== undefined) {
    updates.slackApiKey = data.slackApiKey || null;
  }

  await db.update(user).set(updates).where(eq(user.id, session.user.id));
}
