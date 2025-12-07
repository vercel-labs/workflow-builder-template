import "server-only";

import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { initializeParaSigner } from "@/lib/para/wallet-helpers";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type WriteContractResult =
  | { success: true; transactionHash: string; result?: unknown }
  | { success: false; error: string };

export type WriteContractCoreInput = {
  contractAddress: string;
  network: string;
  abi: string;
  abiFunction: string;
  functionArgs?: string;
};

export type WriteContractInput = StepInput & WriteContractCoreInput;

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
 * Core write contract logic
 */
async function stepHandler(
  input: WriteContractInput
): Promise<WriteContractResult> {
  console.log("[Write Contract] Starting step with input:", {
    contractAddress: input.contractAddress,
    network: input.network,
    abiFunction: input.abiFunction,
    hasFunctionArgs: !!input.functionArgs,
    hasContext: !!input._context,
    executionId: input._context?.executionId,
  });

  const { contractAddress, network, abi, abiFunction, functionArgs, _context } = input;

  // Validate contract address
  if (!ethers.isAddress(contractAddress)) {
    console.error("[Write Contract] Invalid contract address:", contractAddress);
    return {
      success: false,
      error: `Invalid contract address: ${contractAddress}`,
    };
  }

  // Parse ABI
  let parsedAbi: unknown;
  try {
    parsedAbi = JSON.parse(abi);
    console.log("[Write Contract] ABI parsed successfully");
  } catch (error) {
    console.error("[Write Contract] Failed to parse ABI:", error);
    return {
      success: false,
      error: `Invalid ABI JSON: ${getErrorMessage(error)}`,
    };
  }

  // Validate ABI is an array
  if (!Array.isArray(parsedAbi)) {
    console.error("[Write Contract] ABI is not an array");
    return {
      success: false,
      error: "ABI must be a JSON array",
    };
  }

  // Find the selected function in the ABI
  const functionAbi = parsedAbi.find(
    (item: { type: string; name: string }) =>
      item.type === "function" && item.name === abiFunction
  );

  if (!functionAbi) {
    console.error("[Write Contract] Function not found in ABI:", abiFunction);
    return {
      success: false,
      error: `Function '${abiFunction}' not found in ABI`,
    };
  }

  // Parse function arguments
  let args: unknown[] = [];
  if (functionArgs && functionArgs.trim() !== "") {
    try {
      const parsedArgs = JSON.parse(functionArgs);
      if (!Array.isArray(parsedArgs)) {
        console.error("[Write Contract] Function args is not an array");
        return {
          success: false,
          error: "Function arguments must be a JSON array",
        };
      }
      // Filter out empty strings at the end of the array (from UI padding)
      args = parsedArgs.filter((arg, index) => {
        // Keep all non-empty values
        if (arg !== "") return true;
        // Keep empty strings if they're not at the end
        return parsedArgs.slice(index + 1).some((a) => a !== "");
      });
      console.log("[Write Contract] Function arguments parsed:", args);
    } catch (error) {
      console.error("[Write Contract] Failed to parse function arguments:", error);
      return {
        success: false,
        error: `Invalid function arguments JSON: ${getErrorMessage(error)}`,
      };
    }
  }

  // Get userId from executionId (passed via _context)
  if (!_context?.executionId) {
    console.error("[Write Contract] No execution ID in context");
    return {
      success: false,
      error: "Execution ID is required to identify the user",
    };
  }

  let userId: string;
  try {
    console.log("[Write Contract] Looking up user from execution:", _context.executionId);
    userId = await getUserIdFromExecution(_context.executionId);
    console.log("[Write Contract] Found userId:", userId);
  } catch (error) {
    console.error("[Write Contract] Failed to get user ID:", error);
    return {
      success: false,
      error: `Failed to get user ID: ${getErrorMessage(error)}`,
    };
  }

  // Get RPC URL
  let rpcUrl: string;
  try {
    rpcUrl = getRpcUrl(network);
    console.log("[Write Contract] Using RPC URL for network:", network);
  } catch (error) {
    console.error("[Write Contract] Failed to get RPC URL:", error);
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  // Initialize Para signer
  let signer;
  try {
    console.log("[Write Contract] Initializing Para signer for user:", userId);
    signer = await initializeParaSigner(userId, rpcUrl);
    const signerAddress = await signer.getAddress();
    console.log("[Write Contract] Signer initialized successfully:", signerAddress);
  } catch (error) {
    console.error("[Write Contract] Failed to initialize wallet:", error);
    return {
      success: false,
      error: `Failed to initialize wallet: ${getErrorMessage(error)}`,
    };
  }

  // Create contract instance with signer
  let contract: ethers.Contract;
  try {
    contract = new ethers.Contract(contractAddress, parsedAbi, signer);
    console.log("[Write Contract] Contract instance created with Para wallet");
  } catch (error) {
    console.error("[Write Contract] Failed to create contract instance:", error);
    return {
      success: false,
      error: `Failed to create contract instance: ${getErrorMessage(error)}`,
    };
  }

  // Call the contract function
  try {
    console.log("[Write Contract] Calling function:", abiFunction, "with args:", args);

    // Check if function exists
    if (typeof contract[abiFunction] !== "function") {
      console.error("[Write Contract] Function not found:", abiFunction);
      return {
        success: false,
        error: `Function '${abiFunction}' not found in contract ABI`,
      };
    }

    const tx = await contract[abiFunction](...args);

    console.log("[Write Contract] Transaction sent:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    console.log("[Write Contract] Transaction confirmed in block:", receipt.blockNumber);

    // Extract return value if function has outputs
    const outputs = (functionAbi as { outputs?: Array<{ name?: string; type: string }> }).outputs;
    let result: unknown = undefined;

    if (outputs && outputs.length > 0) {
      // For functions with return values, we need to decode the logs or use staticCall
      // For now, we'll just note that the function has outputs
      console.log("[Write Contract] Function has outputs but return values are not extracted from transaction");
    }

    return {
      success: true,
      transactionHash: receipt.hash,
      result,
    };
  } catch (error) {
    console.error("[Write Contract] Function call failed:", error);
    return {
      success: false,
      error: `Contract call failed: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Write Contract Step
 * Writes data to a smart contract using state-changing functions
 */
export async function writeContractStep(
  input: WriteContractInput
): Promise<WriteContractResult> {
  "use step";

  return withStepLogging(input, () => stepHandler(input));
}

export const _integrationType = "web3";
