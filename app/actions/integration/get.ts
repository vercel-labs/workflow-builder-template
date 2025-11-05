"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const MASK_LENGTH = 4;

/**
 * Mask API key for security (show only last N characters)
 */
const maskApiKey = (key: string | null) => {
  if (!key) {
    return null;
  }

  if (key.length <= MASK_LENGTH) {
    return key;
  }

  return `${"*".repeat(key.length - MASK_LENGTH)}${key.slice(-MASK_LENGTH)}`;
};

/**
 * Get user's integration settings with masked API keys
 */
export async function get() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      resendApiKey: true,
      resendFromEmail: true,
      linearApiKey: true,
      slackApiKey: true,
      vercelApiToken: true,
      vercelTeamId: true,
    },
  });

  if (!userData) {
    throw new Error("User not found");
  }

  return {
    resendApiKey: maskApiKey(userData.resendApiKey),
    resendFromEmail: userData.resendFromEmail,
    linearApiKey: maskApiKey(userData.linearApiKey),
    slackApiKey: maskApiKey(userData.slackApiKey),
    vercelApiToken: maskApiKey(userData.vercelApiToken),
    vercelTeamId: userData.vercelTeamId,
    hasResendKey: !!userData.resendApiKey,
    hasLinearKey: !!userData.linearApiKey,
    hasSlackKey: !!userData.slackApiKey,
    hasVercelToken: !!userData.vercelApiToken,
  };
}
