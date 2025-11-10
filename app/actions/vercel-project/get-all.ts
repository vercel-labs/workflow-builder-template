"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { listProjects } from "@/lib/integrations/vercel";

/**
 * Get all Vercel projects for the current user
 * (uses app-level credentials, filters by userId and workflow-builder- prefix)
 */
export async function getAll() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Get app-level Vercel credentials from env vars
  const vercelApiToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelApiToken) {
    throw new Error("Vercel API token not configured");
  }

  // Fetch all projects from Vercel API
  const result = await listProjects({
    apiToken: vercelApiToken,
    teamId: vercelTeamId,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  // Sync only workflow-builder- prefixed projects with local database
  if (result.projects) {
    for (const project of result.projects) {
      // Only sync projects with workflow-builder- prefix
      if (!project.name.startsWith("workflow-builder-")) {
        continue;
      }

      // Check if project already exists in database
      const existingProject = await db.query.projects.findFirst({
        where: eq(projects.vercelProjectId, project.id),
      });

      // Extract display name (remove prefix)
      const displayName = project.name.replace(/^workflow-builder-/, "");

      if (existingProject) {
        // Update existing project
        await db
          .update(projects)
          .set({
            name: displayName,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, existingProject.id));
      }
      // Note: We don't auto-create projects here - they should be created via the create action
      // which associates them with the creating user
    }
  }

  // Return only projects created by this user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  return userProjects;
}
