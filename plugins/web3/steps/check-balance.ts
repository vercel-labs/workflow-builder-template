import "server-only";

import { ethers } from "ethers";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type CheckBalanceResult =
  | { success: true; balance: string; balanceWei: string; address: string }
  | { success: false; error: string };

export type CheckBalanceCoreInput = {
  network: string;
  address: string;
};

export type CheckBalanceInput = StepInput & CheckBalanceCoreInput;

/**
 * Get RPC URL based on network selection
 */
function getRpcUrl(network: string): string {
  const RPC_URLS: Record<string, string> = {
    mainnet: "https://chain.techops.services/eth-mainnet",
    sepolia: "https://chain.techops.services/eth-sepolia",
  };

  const rpcUrl = RPC_URLS[network];
  if (!rpcUrl) {
    throw new Error(`Unsupported network: ${network}`);
  }

  return rpcUrl;
}

/**
 * Core check balance logic
 */
async function stepHandler(
  input: CheckBalanceInput
): Promise<CheckBalanceResult> {
  console.log("[Check Balance] Starting step with input:", {
    network: input.network,
    address: input.address,
  });

  const { network, address } = input;

  // Validate address
  if (!ethers.isAddress(address)) {
    console.error("[Check Balance] Invalid address:", address);
    return {
      success: false,
      error: `Invalid Ethereum address: ${address}`,
    };
  }

  // Get RPC URL
  let rpcUrl: string;
  try {
    rpcUrl = getRpcUrl(network);
    console.log("[Check Balance] Using RPC URL for network:", network);
  } catch (error) {
    console.error("[Check Balance] Failed to get RPC URL:", error);
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  // Check balance
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log("[Check Balance] Checking balance for address:", address);

    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);

    console.log("[Check Balance] Balance retrieved successfully:", {
      address,
      balanceWei: balanceWei.toString(),
      balanceEth,
    });

    return {
      success: true,
      balance: balanceEth,
      balanceWei: balanceWei.toString(),
      address,
    };
  } catch (error) {
    console.error("[Check Balance] Failed to check balance:", error);
    return {
      success: false,
      error: `Failed to check balance: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Check Balance Step
 * Checks the ETH balance of an address (contract or wallet)
 */
export async function checkBalanceStep(
  input: CheckBalanceInput
): Promise<CheckBalanceResult> {
  "use step";

  return withStepLogging(input, () => stepHandler(input));
}

export const _integrationType = "web3";
