import { NextResponse } from "next/server";
import postgres from "postgres";
import { decryptAiGatewayKey } from "@/lib/ai-gateway/crypto";
import { auth } from "@/lib/auth";
import type { DecryptedIntegration } from "@/lib/db/integrations";
import { getIntegration as getIntegrationFromDb } from "@/lib/db/integrations";
import {
  getCredentialMapping,
  getIntegration as getPluginFromRegistry,
} from "@/plugins";
import type { IntegrationPlugin } from "@/plugins/registry";

export type TestConnectionResult = {
  status: "success" | "error";
  message: string;
};

/**
 * Build credentials for testing an integration
 * Handles managed AI Gateway connections specially by decrypting the JWE
 */
async function buildCredentials(
  integration: DecryptedIntegration,
  plugin: IntegrationPlugin
): Promise<Record<string, string> | { error: string }> {
  if (integration.type === "ai-gateway" && integration.isManaged) {
    const encryptedKey = integration.config.apiKey as string;
    if (!encryptedKey) {
      return { error: "No API key found in managed connection" };
    }
    const decrypted = await decryptAiGatewayKey(encryptedKey);
    return { AI_GATEWAY_API_KEY: decrypted.apiKey };
  }
  return getCredentialMapping(plugin, integration.config);
}

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

    const integration = await getIntegrationFromDb(
      integrationId,
      session.user.id
    );

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.type === "database") {
      const result = await testDatabaseConnection(integration.config.url);
      return NextResponse.json(result);
    }

    const plugin = getPluginFromRegistry(integration.type);

    if (!plugin) {
      return NextResponse.json(
        { error: "Invalid integration type" },
        { status: 400 }
      );
    }

    if (!plugin.testConfig) {
      return NextResponse.json(
        { error: "Integration does not support testing" },
        { status: 400 }
      );
    }

    const credentials = await buildCredentials(integration, plugin);
    if ("error" in credentials) {
      return NextResponse.json(
        { status: "error", message: credentials.error },
        { status: 200 }
      );
    }

    const testFn = await plugin.testConfig.getTestFunction();
    const testResult = await testFn(credentials);

    const result: TestConnectionResult = {
      status: testResult.success ? "success" : "error",
      message: testResult.success
        ? "Connection successful"
        : testResult.error || "Connection failed",
    };

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

    connection = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    });

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
    if (connection) {
      await connection.end();
    }
  }
}
