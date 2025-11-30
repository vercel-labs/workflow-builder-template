import { LinearClient } from "@linear/sdk";
import FirecrawlApp from "@mendable/firecrawl-js";
import { WebClient } from "@slack/web-api";
import { createGateway } from "ai";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { Resend } from "resend";
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

    const client = new LinearClient({ apiKey });
    await client.viewer;

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

    const client = new WebClient(apiKey);
    const slackAuth = await client.auth.test();

    if (!slackAuth.ok) {
      return {
        status: "error",
        message: slackAuth.error || "Connection failed",
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

    const resend = new Resend(apiKey);
    const domains = await resend.domains.list();

    if (!domains.data) {
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

    const app = new FirecrawlApp({ apiKey });
    const result = await app.scrape("https://firecrawl.dev", {
      formats: ["markdown"],
    });

    if (!result) {
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

    // Use the REST API endpoint as documented: https://docs.superagent.sh/rest-api/guard
    const response = await fetch("https://app.superagent.sh/api/guard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: "Hello, this is a test message",
      }),
    });

    if (!response.ok) {
      let errorMessage = "Connection failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON, try text
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }

      // Handle specific error codes
      if (response.status === 401) {
        return {
          status: "error",
          message: "Invalid API key",
        };
      }
      if (response.status === 402) {
        return {
          status: "error",
          message: "No subscription found",
        };
      }

      return {
        status: "error",
        message: errorMessage,
      };
    }

    // Parse response to verify it's valid
    const data = await response.json();
    if (data.error) {
      return {
        status: "error",
        message: data.error,
      };
    }

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      status: "error",
      message: errorMessage || "Connection failed",
    };
  }
}
