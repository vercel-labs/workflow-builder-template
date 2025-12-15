import { and, eq } from "drizzle-orm";
import { isAiGatewayManagedKeysEnabled } from "@/lib/ai-gateway/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, integrations } from "@/lib/db/schema";

/**
 * GET /api/ai-gateway/status
 * Returns user's AI Gateway status including whether they can use managed keys
 */
export async function GET(request: Request) {
  const enabled = isAiGatewayManagedKeysEnabled();

  // If feature is not enabled, return minimal response
  if (!enabled) {
    return Response.json({
      enabled: false,
      signedIn: false,
      isVercelUser: false,
      hasManagedKey: false,
    });
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return Response.json({
      enabled: true,
      signedIn: false,
      isVercelUser: false,
      hasManagedKey: false,
    });
  }

  // Check if user signed in with Vercel
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.userId, session.user.id),
  });

  const isVercelUser = account?.providerId === "vercel";

  // Check if user has a managed AI Gateway integration
  const managedIntegration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.type, "ai-gateway"),
      eq(integrations.isManaged, true)
    ),
  });

  return Response.json({
    enabled: true,
    signedIn: true,
    isVercelUser,
    hasManagedKey: !!managedIntegration,
    managedIntegrationId: managedIntegration?.id,
  });
}
