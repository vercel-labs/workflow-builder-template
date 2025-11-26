import { LinearClient } from "@linear/sdk";

export async function testLinear(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.LINEAR_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "LINEAR_API_KEY is required",
      };
    }

    const linear = new LinearClient({ apiKey });

    // Try to fetch teams to verify the API key works
    const teams = await linear.teams();

    if (teams.nodes.length === 0) {
      return {
        success: false,
        error: "No teams found in Linear workspace",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

