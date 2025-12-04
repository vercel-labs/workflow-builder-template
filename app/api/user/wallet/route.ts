import { Environment, Para as ParaServer } from "@getpara/server-sdk";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createIntegration } from "@/lib/db/integrations";
import { integrations, paraWallets } from "@/lib/db/schema";
import { encryptUserShare } from "@/lib/encryption";
import { getUserWallet, userHasWallet } from "@/lib/para/wallet-helpers";

const PARA_API_KEY = process.env.PARA_API_KEY || "";
const PARA_ENV = process.env.PARA_ENVIRONMENT || "beta";

// Helper: Validate user authentication and email
async function validateUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const user = session.user;

  if (!user.email) {
    return { error: "Email required to create wallet", status: 400 };
  }

  // Check if user is anonymous
  if (
    user.email.includes("@http://") ||
    user.email.includes("@https://") ||
    user.email.startsWith("temp-")
  ) {
    return {
      error:
        "Anonymous users cannot create wallets. Please sign in with a real account.",
      status: 400,
    };
  }

  return { user };
}

// Helper: Check if wallet or integration already exists
async function checkExistingWallet(userId: string) {
  const hasWallet = await userHasWallet(userId);
  if (hasWallet) {
    return { error: "Wallet already exists for this user", status: 400 };
  }

  const existingIntegration = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "web3")))
    .limit(1);

  if (existingIntegration.length > 0) {
    return {
      error: "Web3 integration already exists for this user",
      status: 400,
    };
  }

  return { valid: true };
}

// Helper: Create wallet via Para SDK
async function createParaWallet(email: string) {
  if (!PARA_API_KEY) {
    console.error("[Para] PARA_API_KEY not configured");
    throw new Error("Para API key not configured");
  }

  const environment = PARA_ENV === "prod" ? Environment.PROD : Environment.BETA;
  console.log(
    `[Para] Initializing SDK with environment: ${PARA_ENV} (${environment})`
  );
  console.log(`[Para] API key: ${PARA_API_KEY.slice(0, 8)}...`);

  const paraClient = new ParaServer(environment, PARA_API_KEY);

  console.log(`[Para] Creating wallet for email: ${email}`);

  const wallet = await paraClient.createPregenWallet({
    type: "EVM",
    pregenId: { email },
  });

  const userShare = await paraClient.getUserShare();

  if (!userShare) {
    throw new Error("Failed to get user share from Para");
  }

  if (!(wallet.id && wallet.address)) {
    throw new Error("Invalid wallet data from Para");
  }

  return { wallet, userShare };
}

// Helper: Get user-friendly error response for wallet creation failures
function getErrorResponse(error: unknown) {
  console.error("[Para] Wallet creation failed:", error);

  let errorMessage = "Failed to create wallet";
  let statusCode = 500;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("already exists")) {
      errorMessage = "A wallet already exists for this email address";
      statusCode = 409;
    } else if (message.includes("invalid email")) {
      errorMessage = "Invalid email format";
      statusCode = 400;
    } else if (message.includes("forbidden") || message.includes("403")) {
      errorMessage = "API key authentication failed. Please contact support.";
      statusCode = 403;
    } else {
      errorMessage = error.message;
    }
  }

  return NextResponse.json({ error: errorMessage }, { status: statusCode });
}

// Helper: Store wallet in database and create integration
async function storeWalletAndIntegration(options: {
  userId: string;
  email: string;
  walletId: string;
  walletAddress: string;
  userShare: string;
}) {
  const { userId, email, walletId, walletAddress, userShare } = options;

  // Store wallet in para_wallets table
  await db.insert(paraWallets).values({
    userId,
    email,
    walletId,
    walletAddress,
    userShare: encryptUserShare(userShare),
  });

  console.log(`[Para] ✓ Wallet created: ${walletAddress}`);

  // Create Web3 integration record with truncated address as name
  const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  await createIntegration(userId, truncatedAddress, "web3", {});

  console.log(`[Para] ✓ Web3 integration created: ${truncatedAddress}`);

  return { walletAddress, walletId, truncatedAddress };
}

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

export async function POST(request: Request) {
  try {
    // 1. Validate user
    const userValidation = await validateUser(request);
    if ("error" in userValidation) {
      return NextResponse.json(
        { error: userValidation.error },
        { status: userValidation.status }
      );
    }
    const { user } = userValidation;

    // 2. Check if wallet/integration already exists
    const existingCheck = await checkExistingWallet(user.id);
    if ("error" in existingCheck) {
      return NextResponse.json(
        { error: existingCheck.error },
        { status: existingCheck.status }
      );
    }

    // 3. Create wallet via Para SDK
    const { wallet, userShare } = await createParaWallet(user.email);

    // wallet.id and wallet.address are validated in createParaWallet
    const walletId = wallet.id as string;
    const walletAddress = wallet.address as string;

    // 4. Store wallet and create integration
    await storeWalletAndIntegration({
      userId: user.id,
      email: user.email,
      walletId,
      walletAddress,
      userShare,
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      wallet: {
        address: walletAddress,
        walletId,
        email: user.email,
      },
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    // 2. Delete wallet data
    const deletedWallet = await db
      .delete(paraWallets)
      .where(eq(paraWallets.userId, user.id))
      .returning();

    if (deletedWallet.length === 0) {
      return NextResponse.json(
        { error: "No wallet found to delete" },
        { status: 404 }
      );
    }

    console.log(
      `[Para] Wallet deleted for user ${user.id}: ${deletedWallet[0].walletAddress}`
    );

    // 3. Delete associated Web3 integration record
    await db
      .delete(integrations)
      .where(
        and(eq(integrations.userId, user.id), eq(integrations.type, "web3"))
      );

    console.log(`[Para] Web3 integration deleted for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Wallet deleted successfully",
    });
  } catch (error) {
    console.error("[Para] Wallet deletion failed:", error);
    return NextResponse.json(
      {
        error: "Failed to delete wallet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
