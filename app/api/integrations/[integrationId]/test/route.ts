import { createGateway } from "ai";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { auth } from "@/lib/auth";
import { getIntegration } from "@/lib/db/integrations";

export type TestConnectionResult = {
  status: "success" | "error";
  message: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { integrationId } = await params;

    if (!integrationId) {
      return NextResponse.json(
        { error: "integrationId is required" },
        { status: 400 }
      );
    }

    // Get the integration
    const integration = await getIntegration(integrationId, session.user.id);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    let result: TestConnectionResult;

    switch (integration.type) {
      case "linear":
        result = await testLinearConnection(integration.config.apiKey);
        break;
      case "slack":
        result = await testSlackConnection(integration.config.apiKey);
        break;
      case "resend":
        result = await testResendConnection(integration.config.apiKey);
        break;
      case "ai-gateway":
        result = await testAiGatewayConnection(integration.config.apiKey);
        break;
      case "database":
        result = await testDatabaseConnection(integration.config.url);
        break;
      case "firecrawl":
        result = await testFirecrawlConnection(
          integration.config.firecrawlApiKey
        );
        break;
      case "superagent":
        result = await testSuperagentConnection(
          integration.config.superagentApiKey
        );
        break;
      case "clerk":
        result = await testClerkConnection(integration.config.clerkSecretKey);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid integration type" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to test connection:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to test connection",
      },
      { status: 500 }
    );
  }
}

async function testLinearConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: "query { viewer { id } }",
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    const result = (await response.json()) as {
      data?: { viewer?: { id: string } };
      errors?: Array<{ message: string }>;
    };

    if (result.errors?.length || !result.data?.viewer) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  }
}

async function testSlackConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!result.ok) {
      return {
        status: "error",
        message: result.error || "Connection failed",
      };
    }

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  }
}

async function testResendConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  }
}

async function testAiGatewayConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    // Test the Vercel AI Gateway by checking credits
    const gateway = createGateway({ apiKey });
    await gateway.getCredits();

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  }
}

async function testDatabaseConnection(
  databaseUrl?: string
): Promise<TestConnectionResult> {
  let connection: postgres.Sql | null = null;

  try {
    if (!databaseUrl) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    // Create a connection
    connection = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    });

    // Try a simple query
    await connection`SELECT 1`;

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  } finally {
    // Clean up the connection
    if (connection) {
      await connection.end();
    }
  }
}

async function testFirecrawlConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Firecrawl API Key is not configured",
      };
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: "https://example.com",
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        message: "Authentication or scrape failed",
      };
    }

    return {
      status: "success",
      message: "Connected successfully",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testSuperagentConnection(
  apiKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        message: "Superagent API Key is not configured",
      };
    }

    const response = await fetch("https://app.superagent.sh/api/guard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: "Hello, this is a test message.",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        status: "error",
        message: error || "Authentication failed",
      };
    }

    return {
      status: "success",
      message: "Connected successfully",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function testClerkConnection(
  secretKey?: string
): Promise<TestConnectionResult> {
  try {
    if (!secretKey) {
      return {
        status: "error",
        message: "Secret key is required",
      };
    }

    // Validate key format
    if (
      !(secretKey.startsWith("sk_live_") || secretKey.startsWith("sk_test_"))
    ) {
      return {
        status: "error",
        message:
          "Invalid secret key format. Must start with sk_live_ or sk_test_",
      };
    }

    // Test by fetching users list
    const response = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "User-Agent": "workflow-builder.dev",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        status: "error",
        message: error.errors?.[0]?.message || "Authentication failed",
      };
    }

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
