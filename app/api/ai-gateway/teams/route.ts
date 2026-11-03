import { eq } from "drizzle-orm";
import { isAiGatewayManagedKeysEnabled } from "@/lib/ai-gateway/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

export type VercelTeam = {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  isPersonal: boolean;
};

type VercelTeamApiResponse = {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  limited?: boolean;
};

type VercelUserResponse = {
  defaultTeamId: string | null;
};

/**
 * Fetch user's default team ID from Vercel API
 */
async function fetchDefaultTeamId(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user?: VercelUserResponse };
  return data.user?.defaultTeamId ?? null;
}

/**
 * Fetch teams from Vercel API and transform to our format
 */
async function fetchTeams(accessToken: string): Promise<VercelTeam[]> {
  const response = await fetch("https://api.vercel.com/v2/teams", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { teams?: VercelTeamApiResponse[] };
  const teams: VercelTeam[] = [];

  for (const team of data.teams || []) {
    if (team.limited) {
      continue;
    }
    teams.push({
      id: team.id,
      name: team.name,
      slug: team.slug,
      // Team avatar URL uses teamId
      avatar: `https://vercel.com/api/www/avatar?teamId=${team.id}&s=64`,
      isPersonal: false,
    });
  }

  return teams;
}

/**
 * GET /api/ai-gateway/teams
 * Fetch Vercel teams for the authenticated user
 */
export async function GET(request: Request) {
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

  try {
    // Fetch default team ID and teams in parallel
    const [defaultTeamId, teams] = await Promise.all([
      fetchDefaultTeamId(account.accessToken),
      fetchTeams(account.accessToken),
    ]);

    // Mark the user's default team as personal
    const teamsWithPersonal = teams.map((team) => ({
      ...team,
      isPersonal: team.id === defaultTeamId,
    }));

    // Sort: personal/default team first, then alphabetically by name
    const sortedTeams = teamsWithPersonal.sort((a, b) => {
      if (a.isPersonal) {
        return -1;
      }
      if (b.isPersonal) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return Response.json({ teams: sortedTeams });
  } catch (e) {
    console.error("[ai-gateway] Error fetching teams:", e);
    return Response.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
