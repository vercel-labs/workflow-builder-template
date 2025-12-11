import { ethers } from "ethers";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/**
 * Get Etherscan API URL and chainid based on network (using v2 API)
 * V2 uses a single base URL with chainid parameter instead of network-specific subdomains
 */
function getEtherscanApiConfig(network: string): {
  baseUrl: string;
  chainid: string;
} {
  const configs: Record<string, { baseUrl: string; chainid: string }> = {
    mainnet: {
      baseUrl: "https://api.etherscan.io/v2/api",
      chainid: "1",
    },
    sepolia: {
      baseUrl: "https://api.etherscan.io/v2/api",
      chainid: "11155111",
    },
  };

  const config = configs[network];
  if (!config) {
    throw new Error(`Unsupported network: ${network}`);
  }

  return config;
}

/**
 * Parse Etherscan error message into user-friendly message
 */
function parseEtherscanError(
  data: { status: string; message: string; result: string },
  contractAddress: string,
  network: string
): string {
  const errorMessage =
    data.result || data.message || "Failed to fetch ABI from Etherscan";
  const lowerMessage = errorMessage.toLowerCase();

  // Log the full response for debugging
  console.error("[Etherscan] API error response:", {
    status: data.status,
    message: data.message,
    result: data.result,
    contractAddress,
    network,
  });

  // Provide user-friendly error messages for common cases
  if (
    lowerMessage.includes("not verified") ||
    lowerMessage.includes("source code not verified")
  ) {
    return "Contract source code not verified on Etherscan. Please provide ABI manually.";
  }

  if (
    lowerMessage.includes("invalid api key") ||
    lowerMessage.includes("api key")
  ) {
    return "Etherscan API key is invalid or not configured. Please contact support.";
  }

  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("max rate limit")
  ) {
    return "Etherscan API rate limit exceeded. Please try again in a few moments.";
  }

  // Handle deprecated V1 endpoint error
  if (
    lowerMessage.includes("deprecated") ||
    lowerMessage.includes("v1 endpoint") ||
    lowerMessage.includes("v2-migration")
  ) {
    return "Etherscan API endpoint needs to be updated. Please contact support.";
  }

  // For "NOTOK" generic errors, provide a more helpful message
  if (errorMessage === "NOTOK" || data.message === "NOTOK") {
    return "Unable to fetch ABI from Etherscan. The contract may not be verified, or there may be an API issue. Please try providing the ABI manually.";
  }

  // For other errors, use the result message if available
  return errorMessage;
}

/**
 * Fetch ABI from Etherscan API
 */
async function fetchAbiFromEtherscan(
  contractAddress: string,
  network: string
): Promise<string> {
  console.log("[Etherscan] fetchAbiFromEtherscan called with:", {
    contractAddress,
    network,
  });

  if (!ETHERSCAN_API_KEY) {
    console.error("[Etherscan] API key not configured");
    throw new Error("Etherscan API key not configured");
  }

  console.log("[Etherscan] API key present:", ETHERSCAN_API_KEY ? "Yes" : "No");

  // Validate contract address
  if (!ethers.isAddress(contractAddress)) {
    console.error("[Etherscan] Invalid contract address:", contractAddress);
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }

  console.log("[Etherscan] Contract address validated");

  const { baseUrl, chainid } = getEtherscanApiConfig(network);
  console.log("[Etherscan] Base URL:", baseUrl);
  console.log("[Etherscan] Chain ID:", chainid);

  const url = new URL(baseUrl);
  url.searchParams.set("chainid", chainid);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("apikey", ETHERSCAN_API_KEY);

  const requestUrl = url.toString();
  console.log(
    "[Etherscan] Full request URL:",
    requestUrl.replace(ETHERSCAN_API_KEY, "***")
  );

  console.log("[Etherscan] Making fetch request...");
  const response = await fetch(requestUrl);
  console.log(
    "[Etherscan] Response status:",
    response.status,
    response.statusText
  );
  console.log("[Etherscan] Response ok:", response.ok);

  if (!response.ok) {
    console.error("[Etherscan] HTTP error response:", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(
      `Etherscan API error: ${response.status} ${response.statusText}`
    );
  }

  console.log("[Etherscan] Parsing JSON response...");
  const data = (await response.json()) as {
    status: string;
    message: string;
    result: string;
  };

  console.log("[Etherscan] Response data:", {
    status: data.status,
    message: data.message,
    resultLength: data.result ? data.result.length : 0,
  });

  if (data.status === "0") {
    // Etherscan returns status "0" for errors
    console.error("[Etherscan] Etherscan API returned error status");
    const errorMessage = parseEtherscanError(data, contractAddress, network);
    throw new Error(errorMessage);
  }

  if (!data.result || data.result === "Contract source code not verified") {
    console.error("[Etherscan] Contract not verified or no result");
    throw new Error(
      "Contract source code not verified on Etherscan. Please provide ABI manually."
    );
  }

  // Validate that result is valid JSON
  try {
    console.log("[Etherscan] Validating ABI JSON...");
    const abi = JSON.parse(data.result);
    if (!Array.isArray(abi)) {
      console.error("[Etherscan] ABI is not an array");
      throw new Error("Invalid ABI format: expected array");
    }
    console.log(
      "[Etherscan] ABI validated successfully, item count:",
      abi.length
    );
    return data.result;
  } catch (error) {
    console.error("[Etherscan] Failed to parse ABI:", error);
    throw new Error(
      `Invalid ABI format from Etherscan: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("[Etherscan] POST request received");

    // Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      console.log("[Etherscan] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Etherscan] User authenticated:", session.user.id);

    // Parse request body
    const body = (await request.json().catch(() => ({}))) as {
      contractAddress?: string;
      network?: string;
    };

    console.log("[Etherscan] Request body:", body);

    const { contractAddress, network } = body;

    if (!contractAddress) {
      console.log("[Etherscan] Missing contract address");
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      );
    }

    if (!network) {
      console.log("[Etherscan] Missing network");
      return NextResponse.json(
        { error: "Network is required" },
        { status: 400 }
      );
    }

    console.log("[Etherscan] Fetching ABI for:", { contractAddress, network });

    // Fetch ABI from Etherscan
    const abi = await fetchAbiFromEtherscan(contractAddress, network);

    console.log("[Etherscan] Successfully fetched ABI, length:", abi.length);

    return NextResponse.json({
      success: true,
      abi,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch ABI from Etherscan");
  }
}
