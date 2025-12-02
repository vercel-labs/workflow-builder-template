const LINEAR_API_URL = "https://api.linear.app/graphql";

type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ViewerQueryResponse = {
  viewer: {
    id: string;
    name: string;
  };
};

export async function testLinear(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.LINEAR_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "LINEAR_API_KEY is required",
      };
    }

    // Validate API key by fetching viewer (lightweight query)
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `query { viewer { id name } }`,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your Linear API key.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    const result = (await response.json()) as LinearGraphQLResponse<ViewerQueryResponse>;

    if (result.errors?.length) {
      return {
        success: false,
        error: result.errors[0].message,
      };
    }

    if (!result.data?.viewer) {
      return {
        success: false,
        error: "Failed to verify Linear connection",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

