import { and, eq } from "drizzle-orm";
import { isAiGatewayManagedKeysEnabled } from "@/lib/ai-gateway/config";
import { encryptAiGatewayKey } from "@/lib/ai-gateway/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/db/integrations";
import { accounts, integrations } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";

const API_KEY_PURPOSE = "ai-gateway";
const API_KEY_NAME = "Workflow Builder Gateway Key";

/**
 * Get team ID from Vercel API
 * First tries /v2/teams, then falls back to userinfo endpoint
 */
async function getTeamId(accessToken: string): Promise<string | null> {
  // First, try to get teams the user has granted access to
  const teamsResponse = await fetch("https://api.vercel.com/v2/teams", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (teamsResponse.ok) {
    const teamsData = await teamsResponse.json();
    // biome-ignore lint/suspicious/noExplicitAny: API response type
    const accessibleTeam = teamsData.teams?.find((t: any) => !t.limited);
    if (accessibleTeam) {
      return accessibleTeam.id;
    }
  }

  // Fallback: get user ID from userinfo endpoint
  const userinfoResponse = await fetch(
    "https://api.vercel.com/login/oauth/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!userinfoResponse.ok) {
    return null;
  }

  const userinfo = await userinfoResponse.json();
  return userinfo.sub;
}

/**
 * Create or exchange API key on Vercel
 */
async function createVercelApiKey(
  accessToken: string,
  teamId: string
): Promise<{ token: string; id: string } | null> {
  const response = await fetch(
    `https://api.vercel.com/v1/api-keys?teamId=${teamId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purpose: API_KEY_PURPOSE,
        name: API_KEY_NAME,
        exchange: true,
      }),
    }
  );

  if (!response.ok) {
    console.error(
      "[ai-gateway] Failed to create API key:",
      await response.text()
    );
    return null;
  }

  const newKey = await response.json();
  if (!newKey.apiKeyString) {
    return null;
  }

  return { token: newKey.apiKeyString, id: newKey.apiKey?.id };
}

type SaveIntegrationParams = {
  userId: string;
  encryptedKey: string;
  apiKeyId: string;
  teamId: string;
  teamName: string;
};

/**
 * Save managed integration in database
 * Each team gets its own managed integration - always creates a new one
 * The apiKeyId and teamId are stored in config for later deletion
 */
async function saveIntegration(params: SaveIntegrationParams): Promise<string> {
  const { userId, encryptedKey, apiKeyId, teamId, teamName } = params;

  // Config contains the JWE-encrypted API key plus metadata
  const configData = { apiKey: encryptedKey, managedKeyId: apiKeyId, teamId };
  // Encrypt the entire config for storage (consistent with other integrations)
  const encryptedConfig = encrypt(JSON.stringify(configData));

  // Always create a new integration - users can have multiple managed keys for different teams
  const integrationId = generateId();
  await db.insert(integrations).values({
    id: integrationId,
    userId,
    name: teamName,
    type: "ai-gateway",
    config: encryptedConfig,
    isManaged: true,
  });
  return integrationId;
}

/**
 * Delete API key from Vercel
 */
async function deleteVercelApiKey(
  accessToken: string,
  apiKeyId: string,
  teamId: string
): Promise<void> {
  await fetch(
    `https://api.vercel.com/v1/api-keys/${apiKeyId}?teamId=${teamId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

/**
 * POST /api/ai-gateway/consent
 * Record consent and create API key on user's Vercel account
 */
export async function POST(request: Request) {
  if (!isAiGatewayManagedKeysEnabled()) {
    return Response.json({ error: "Feature not enabled" }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.userId, session.user.id),
  });

  if (!account?.accessToken || account.providerId !== "vercel") {
    return Response.json(
      { error: "No Vercel account linked" },
      { status: 400 }
    );
  }

  // Get teamId and teamName from request body
  let teamId: string | null = null;
  let teamName: string | null = null;
  try {
    const body = await request.json();
    teamId = body.teamId;
    teamName = body.teamName;
  } catch {
    // If no body, try to auto-detect
  }

  // If no teamId provided, try to auto-detect
  if (!teamId) {
    teamId = await getTeamId(account.accessToken);
  }

  if (!teamId) {
    return Response.json(
      { error: "Could not determine user's team" },
      { status: 500 }
    );
  }

  try {
    const apiKey = await createVercelApiKey(account.accessToken, teamId);
    if (!apiKey) {
      return Response.json(
        { error: "Failed to create API key" },
        { status: 500 }
      );
    }

    const encryptedKey = await encryptAiGatewayKey({
      apiKey: apiKey.token,
      userId: session.user.id,
    });

    const integrationId = await saveIntegration({
      userId: session.user.id,
      encryptedKey,
      apiKeyId: apiKey.id,
      teamId,
      teamName: teamName || "AI Gateway",
    });

    return Response.json({
      success: true,
      hasManagedKey: true,
      managedIntegrationId: integrationId,
    });
  } catch (e) {
    console.error("[ai-gateway] Error creating API key:", e);
    return Response.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-gateway/consent
 * Revoke consent and delete the API key
 */
export async function DELETE(request: Request) {
  if (!isAiGatewayManagedKeysEnabled()) {
    return Response.json({ error: "Feature not enabled" }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const managedIntegration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.type, "ai-gateway"),
      eq(integrations.isManaged, true)
    ),
  });

  // Get managedKeyId and teamId from config
  const config = managedIntegration?.config as {
    managedKeyId?: string;
    teamId?: string;
  };

  if (config?.managedKeyId && config?.teamId) {
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.user.id),
    });

    if (account?.accessToken) {
      try {
        await deleteVercelApiKey(
          account.accessToken,
          config.managedKeyId,
          config.teamId
        );
      } catch (e) {
        console.error("[ai-gateway] Failed to delete API key from Vercel:", e);
      }
    }
  }

  if (managedIntegration) {
    await db
      .delete(integrations)
      .where(eq(integrations.id, managedIntegration.id));
  }

  return Response.json({ success: true, hasManagedKey: false });
}
