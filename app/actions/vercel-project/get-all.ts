"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, vercelProjects } from "@/lib/db/schema";
import { listProjects } from "@/lib/integrations/vercel";

/**
 * Get all Vercel projects for the current user (syncs with Vercel API)
 */
export async function getAll() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      vercelApiToken: true,
      vercelTeamId: true,
    },
  });

  if (!userData?.vercelApiToken) {
    throw new Error("Vercel API token not configured");
  }

  // Fetch projects from Vercel API
  const result = await listProjects({
    apiToken: userData.vercelApiToken,
    teamId: userData.vercelTeamId || undefined,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  // Sync projects with local database
  if (result.projects) {
    for (const project of result.projects) {
      // Check if project already exists
      const existingProject = await db.query.vercelProjects.findFirst({
        where: eq(vercelProjects.vercelProjectId, project.id),
      });

      if (existingProject) {
        // Update existing project
        await db
          .update(vercelProjects)
          .set({
            name: project.name,
            framework: project.framework || null,
            updatedAt: new Date(),
          })
          .where(eq(vercelProjects.id, existingProject.id));
      } else {
        // Insert new project
        await db.insert(vercelProjects).values({
          userId: session.user.id,
          vercelProjectId: project.id,
          name: project.name,
          framework: project.framework || null,
        });
      }
    }
  }

  // Fetch updated projects from local database
  const localProjects = await db.query.vercelProjects.findMany({
    where: eq(vercelProjects.userId, session.user.id),
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
  });

  return localProjects;
}
