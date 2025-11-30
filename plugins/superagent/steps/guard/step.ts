import "server-only";

import { createClient } from "superagent-ai";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Superagent Guard Step
 * Analyzes text or PDF files for security threats
 */
export async function superagentGuardStep(input: {
  integrationId?: string;
  input: string | File | Blob;
  onBlock?: "stop" | "continue";
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.SUPERAGENT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Superagent API Key is not configured.",
    };
  }

  try {
    const client = createClient({
      apiKey,
    });

    const guardResult = await client.guard(input.input, {
      onBlock: (reason) => {
        if (input.onBlock === "stop") {
          throw new Error(`Guard blocked: ${reason}`);
        }
      },
      onPass: () => {
        // Guard approved, continue
      },
    });

    if (guardResult.rejected && input.onBlock === "stop") {
      throw new Error(
        `Guard blocked: ${guardResult.reasoning || "Security threat detected"}`
      );
    }

    return {
      rejected: guardResult.rejected || false,
      reasoning: guardResult.reasoning || "",
      decision: guardResult.decision,
      usage: guardResult.usage,
    };
  } catch (error) {
    throw new Error(`Failed to guard input: ${getErrorMessage(error)}`);
  }
}
