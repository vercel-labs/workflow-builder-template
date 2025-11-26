import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAnonymous: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the user's account to determine auth provider
    const userAccount = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.user.id),
      columns: {
        providerId: true,
      },
    });

    return NextResponse.json({
      ...userData,
      providerId: userAccount?.providerId ?? null,
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get user",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an OAuth user (can't update profile)
    const userAccount = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.user.id),
      columns: {
        providerId: true,
      },
    });

    // Block updates for OAuth users (vercel, github, google, etc.)
    const oauthProviders = ["vercel", "github", "google"];
    if (userAccount && oauthProviders.includes(userAccount.providerId)) {
      return NextResponse.json(
        { error: "Cannot update profile for OAuth users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: { name?: string; email?: string } = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.email !== undefined) {
      updates.email = body.email;
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}
