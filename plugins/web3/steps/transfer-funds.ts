import "server-only";

import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { initializeParaSigner } from "@/lib/para/wallet-helpers";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type TransferFundsResult =
  | { success: true; transactionHash: string }
  | { success: false; error: string };

export type TransferFundsCoreInput = {
  amount: string;
  recipientAddress: string;
};

export type TransferFundsInput = StepInput & TransferFundsCoreInput;

/**
 * Get userId from executionId by querying the workflowExecutions table
 */
async function getUserIdFromExecution(
  executionId: string | undefined
): Promise<string> {
  if (!executionId) {
    throw new Error("Execution ID is required to get user ID");
  }

  const execution = await db
    .select({ userId: workflowExecutions.userId })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (execution.length === 0) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  return execution[0].userId;
}

/**
 * Core transfer logic
 */
async function stepHandler(
  input: TransferFundsInput
): Promise<TransferFundsResult> {
  console.log("[Transfer Funds] Starting step with input:", {
    amount: input.amount,
    recipientAddress: input.recipientAddress,
    hasContext: !!input._context,
    executionId: input._context?.executionId,
  });

  const { amount, recipientAddress, _context } = input;

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    console.error("[Transfer Funds] Invalid recipient address:", recipientAddress);
    return {
      success: false,
      error: `Invalid recipient address: ${recipientAddress}`,
    };
  }

  // Validate amount
  if (!amount || amount.trim() === "") {
    console.error("[Transfer Funds] Amount is missing");
    return {
      success: false,
      error: "Amount is required",
    };
  }

  let amountInWei: bigint;
  try {
    amountInWei = ethers.parseEther(amount);
    console.log("[Transfer Funds] Amount parsed:", { amount, amountInWei: amountInWei.toString() });
  } catch (error) {
    console.error("[Transfer Funds] Failed to parse amount:", error);
    return {
      success: false,
      error: `Invalid amount format: ${getErrorMessage(error)}`,
    };
  }

  // Get userId from executionId (passed via _context)
  if (!_context?.executionId) {
    console.error("[Transfer Funds] No execution ID in context");
    return {
      success: false,
      error: "Execution ID is required to identify the user",
    };
  }

  let userId: string;
  try {
    console.log("[Transfer Funds] Looking up user from execution:", _context.executionId);
    userId = await getUserIdFromExecution(_context.executionId);
    console.log("[Transfer Funds] Found userId:", userId);
  } catch (error) {
    console.error("[Transfer Funds] Failed to get user ID:", error);
    return {
      success: false,
      error: `Failed to get user ID: ${getErrorMessage(error)}`,
    };
  }

  // Sepolia testnet RPC URL
  // TODO: Make this configurable in the future
  const SEPOLIA_RPC_URL = "https://chain.techops.services/eth-sepolia";

  let signer;
  try {
    console.log("[Transfer Funds] Initializing Para signer for user:", userId);
    signer = await initializeParaSigner(userId, SEPOLIA_RPC_URL);
    const signerAddress = await signer.getAddress();
    console.log("[Transfer Funds] Signer initialized successfully:", signerAddress);
  } catch (error) {
    console.error("[Transfer Funds] Failed to initialize wallet:", error);
    return {
      success: false,
      error: `Failed to initialize wallet: ${getErrorMessage(error)}`,
    };
  }

  // Send transaction
  try {
    console.log("[Transfer Funds] Sending transaction:", {
      to: recipientAddress,
      value: amountInWei.toString(),
    });

    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: amountInWei,
    });

    console.log("[Transfer Funds] Transaction sent, hash:", tx.hash);
    console.log("[Transfer Funds] Waiting for confirmation...");

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    if (!receipt) {
      console.error("[Transfer Funds] No receipt received");
      return {
        success: false,
        error: "Transaction sent but receipt not available",
      };
    }

    console.log("[Transfer Funds] Transaction confirmed:", {
      hash: receipt.hash,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
    });

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error("[Transfer Funds] Transaction failed:", error);
    return {
      success: false,
      error: `Transaction failed: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Transfer Funds Step
 * Transfers ETH from the user's wallet to a recipient address
 */
export async function transferFundsStep(
  input: TransferFundsInput
): Promise<TransferFundsResult> {
  "use step";

  return withStepLogging(input, () => stepHandler(input));
}

export const _integrationType = "web3";
