"use server";

import { headers } from "next/headers";
import { customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { createProject } from "@/lib/integrations/vercel";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

/**
 * Create a new Vercel project (uses app-level Vercel credentials)
 */
export async function create(data: { name: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!data.name?.trim()) {
    throw new Error("Project name is required");
  }

  // Get app-level Vercel credentials from env vars
  const vercelApiToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelApiToken) {
    throw new Error("Vercel API token not configured");
  }

  // Generate project ID first (lowercase for Vercel compatibility)
  const projectId = nanoid().toLowerCase();

  // Use project ID in the Vercel project name (must be lowercase)
  const prefixedName = `workflow-builder-${projectId}`;

  // Create project on Vercel using app-level credentials
  const result = await createProject({
    name: prefixedName,
    apiToken: vercelApiToken,
    teamId: vercelTeamId,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  if (!result.project) {
    throw new Error("Failed to create project on Vercel");
  }

  // Store in local database with the same ID
  const [newProject] = await db
    .insert(projects)
    .values({
      id: projectId,
      userId: session.user.id,
      name: data.name.trim(), // Store display name without prefix
      vercelProjectId: result.project.id,
    })
    .returning();

  return newProject;
}
