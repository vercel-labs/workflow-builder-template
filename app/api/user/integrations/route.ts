import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mask API keys for security (show only last 4 characters)
    const maskApiKey = (key: string | null) => {
      if (!key) return null;
      if (key.length <= 4) return key;
      return "*".repeat(key.length - 4) + key.slice(-4);
    };

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch integrations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      resendApiKey,
      resendFromEmail,
      linearApiKey,
      slackApiKey,
      vercelApiToken,
      vercelTeamId,
    } = body;

    const updates: {
      resendApiKey?: string | null;
      resendFromEmail?: string | null;
      linearApiKey?: string | null;
      slackApiKey?: string | null;
      vercelApiToken?: string | null;
      vercelTeamId?: string | null;
    } = {};

    if (resendApiKey !== undefined) {
      updates.resendApiKey = resendApiKey || null;
    }

    if (resendFromEmail !== undefined) {
      updates.resendFromEmail = resendFromEmail || null;
    }

    if (linearApiKey !== undefined) {
      updates.linearApiKey = linearApiKey || null;
    }

    if (slackApiKey !== undefined) {
      updates.slackApiKey = slackApiKey || null;
    }

    if (vercelApiToken !== undefined) {
      updates.vercelApiToken = vercelApiToken || null;
    }

    if (vercelTeamId !== undefined) {
      updates.vercelTeamId = vercelTeamId || null;
    }

    await db.update(user).set(updates).where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update integrations:", error);
    return NextResponse.json(
      {
        error: "Failed to update integrations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
