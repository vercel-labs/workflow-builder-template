import "server-only";
import { db } from "@/lib/db";
import { paraWallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Para as ParaServer, Environment } from "@getpara/server-sdk";
import { ParaEthersSigner } from "@getpara/ethers-v6-integration";
import { ethers } from "ethers";
import { decryptUserShare } from "@/lib/encryption";

/**
 * Get user's Para wallet from database
 * @throws Error if wallet not found
 */
export async function getUserWallet(userId: string) {
  const wallet = await db
    .select()
    .from(paraWallets)
    .where(eq(paraWallets.userId, userId))
    .limit(1);

  if (wallet.length === 0) {
    throw new Error("No Para wallet found for user");
  }

  return wallet[0];
}

/**
 * Initialize Para signer for user
 * This signer can sign transactions using the user's Para wallet
 *
 * @param userId - User ID from session
 * @param rpcUrl - Blockchain RPC URL (e.g., Ethereum mainnet, Polygon, etc.)
 * @returns Para Ethers signer ready to sign transactions
 */
export async function initializeParaSigner(
  userId: string,
  rpcUrl: string
): Promise<ParaEthersSigner> {
  const PARA_API_KEY = process.env.PARA_API_KEY;
  const PARA_ENV = process.env.PARA_ENVIRONMENT || "beta";

  if (!PARA_API_KEY) {
    throw new Error("PARA_API_KEY not configured");
  }

  // Get user's wallet from database
  const wallet = await getUserWallet(userId);

  // Initialize Para client
  const paraClient = new ParaServer(
    PARA_ENV === "prod" ? Environment.PROD : Environment.BETA,
    PARA_API_KEY
  );

  // Decrypt and set user's keyshare
  const decryptedShare = decryptUserShare(wallet.userShare);
  await paraClient.setUserShare(decryptedShare);

  // Create blockchain provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ParaEthersSigner(paraClient, provider);

  return signer;
}

/**
 * Get user's wallet address
 * Useful for displaying wallet address in UI
 */
export async function getUserWalletAddress(userId: string): Promise<string> {
  const wallet = await getUserWallet(userId);
  return wallet.walletAddress;
}

/**
 * Check if user has a Para wallet
 */
export async function userHasWallet(userId: string): Promise<boolean> {
  const wallet = await db
    .select()
    .from(paraWallets)
    .where(eq(paraWallets.userId, userId))
    .limit(1);

  return wallet.length > 0;
}
