import "server-only";

import { ethers } from "ethers";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type ReadContractResult =
  | { success: true; result: unknown }
  | { success: false; error: string };

export type ReadContractCoreInput = {
  contractAddress: string;
  network: string;
  abi: string;
  abiFunction: string;
  functionArgs?: string;
};

export type ReadContractInput = StepInput & ReadContractCoreInput;

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
 * Core read contract logic
 */
async function stepHandler(
  input: ReadContractInput
): Promise<ReadContractResult> {
  console.log("[Read Contract] Starting step with input:", {
    contractAddress: input.contractAddress,
    network: input.network,
    abiFunction: input.abiFunction,
    hasFunctionArgs: !!input.functionArgs,
  });

  const { contractAddress, network, abi, abiFunction, functionArgs } = input;

  // Validate contract address
  if (!ethers.isAddress(contractAddress)) {
    console.error("[Read Contract] Invalid contract address:", contractAddress);
    return {
      success: false,
      error: `Invalid contract address: ${contractAddress}`,
    };
  }

  // Parse ABI
  let parsedAbi: unknown;
  try {
    parsedAbi = JSON.parse(abi);
    console.log("[Read Contract] ABI parsed successfully");
  } catch (error) {
    console.error("[Read Contract] Failed to parse ABI:", error);
    return {
      success: false,
      error: `Invalid ABI JSON: ${getErrorMessage(error)}`,
    };
  }

  // Validate ABI is an array
  if (!Array.isArray(parsedAbi)) {
    console.error("[Read Contract] ABI is not an array");
    return {
      success: false,
      error: "ABI must be a JSON array",
    };
  }

  // Parse function arguments
  let args: unknown[] = [];
  if (functionArgs && functionArgs.trim() !== "") {
    try {
      const parsedArgs = JSON.parse(functionArgs);
      if (!Array.isArray(parsedArgs)) {
        console.error("[Read Contract] Function args is not an array");
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
      console.log("[Read Contract] Function arguments parsed:", args);
    } catch (error) {
      console.error("[Read Contract] Failed to parse function arguments:", error);
      return {
        success: false,
        error: `Invalid function arguments JSON: ${getErrorMessage(error)}`,
      };
    }
  }

  // Get RPC URL
  let rpcUrl: string;
  try {
    rpcUrl = getRpcUrl(network);
    console.log("[Read Contract] Using RPC URL for network:", network);
  } catch (error) {
    console.error("[Read Contract] Failed to get RPC URL:", error);
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  // Create provider and contract instance
  let contract: ethers.Contract;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    contract = new ethers.Contract(contractAddress, parsedAbi, provider);
    console.log("[Read Contract] Contract instance created");
  } catch (error) {
    console.error("[Read Contract] Failed to create contract instance:", error);
    return {
      success: false,
      error: `Failed to create contract instance: ${getErrorMessage(error)}`,
    };
  }

  // Call the contract function
  try {
    console.log("[Read Contract] Calling function:", abiFunction, "with args:", args);

    // Check if function exists
    if (typeof contract[abiFunction] !== "function") {
      console.error("[Read Contract] Function not found:", abiFunction);
      return {
        success: false,
        error: `Function '${abiFunction}' not found in contract ABI`,
      };
    }

    const result = await contract[abiFunction](...args);

    console.log("[Read Contract] Function call successful, result:", result);

    // Convert BigInt values to strings for JSON serialization
    const serializedResult = JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return {
      success: true,
      result: serializedResult,
    };
  } catch (error) {
    console.error("[Read Contract] Function call failed:", error);
    return {
      success: false,
      error: `Contract call failed: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Read Contract Step
 * Reads data from a smart contract using view/pure functions
 */
export async function readContractStep(
  input: ReadContractInput
): Promise<ReadContractResult> {
  "use step";

  return withStepLogging(input, () => stepHandler(input));
}

export const _integrationType = "web3";
