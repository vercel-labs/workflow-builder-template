import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWallet, userHasWallet } from "@/lib/para/wallet-helpers";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasWallet = await userHasWallet(session.user.id);

    if (!hasWallet) {
      return NextResponse.json({
        hasWallet: false,
        message: "No Para wallet found for this user",
      });
    }

    const wallet = await getUserWallet(session.user.id);

    return NextResponse.json({
      hasWallet: true,
      walletAddress: wallet.walletAddress,
      walletId: wallet.walletId,
      email: wallet.email,
      createdAt: wallet.createdAt,
    });
  } catch (error) {
    console.error("Failed to get wallet:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get wallet",
      },
      { status: 500 }
    );
  }
}
