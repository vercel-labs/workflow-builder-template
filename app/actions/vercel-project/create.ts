"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, vercelProjects } from "@/lib/db/schema";
import { createProject } from "@/lib/integrations/vercel";

/**
 * Create a new Vercel project
 */
export async function create(data: { name: string; framework?: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!data.name?.trim()) {
    throw new Error("Project name is required");
  }

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      vercelApiToken: true,
      vercelTeamId: true,
    },
  });

  let vercelProjectId: string;
  let actualFramework: string | null = data.framework || null;

  // If user has Vercel API token configured, create a real project on Vercel
  if (userData?.vercelApiToken) {
    const result = await createProject({
      name: data.name.trim(),
      apiToken: userData.vercelApiToken,
      teamId: userData.vercelTeamId || undefined,
      framework: data.framework || undefined,
    });

    if (result.status === "error") {
      throw new Error(result.error);
    }

    if (!result.project) {
      throw new Error("Failed to create project on Vercel");
    }

    vercelProjectId = result.project.id;
    actualFramework = result.project.framework;
  } else {
    // Create a local project entry only (no Vercel API token)
    vercelProjectId = `local-${Date.now()}`;
  }

  // Store in local database
  const [newProject] = await db
    .insert(vercelProjects)
    .values({
      userId: session.user.id,
      name: data.name.trim(),
      vercelProjectId,
      framework: actualFramework,
    })
    .returning();

  return newProject;
}
