import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import {
  deleteIntegration,
  getIntegration,
  updateIntegration,
} from "@/lib/db/integrations";
import type { IntegrationConfig } from "@/lib/types/integration";

export type GetIntegrationResponse = {
  id: string;
  name: string;
  type: string;
  config: IntegrationConfig;
  createdAt: string;
  updatedAt: string;
};

export type UpdateIntegrationRequest = {
  name?: string;
  config?: IntegrationConfig;
};

/**
 * GET /api/integrations/[integrationId]
 * Get a single integration with decrypted config
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await getIntegration(integrationId, session.user.id);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const response: GetIntegrationResponse = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: integration.config,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return apiError(error, "Failed to get integration");
  }
}

/**
 * PUT /api/integrations/[integrationId]
 * Update an integration
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateIntegrationRequest = await request.json();

    const integration = await updateIntegration(
      integrationId,
      session.user.id,
      body
    );

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const response: GetIntegrationResponse = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: integration.config,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return apiError(error, "Failed to update integration");
  }
}

/**
 * DELETE /api/integrations/[integrationId]
 * Delete an integration
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await deleteIntegration(integrationId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to delete integration");
  }
}
