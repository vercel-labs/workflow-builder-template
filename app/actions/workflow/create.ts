"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, workflows } from "@/lib/db/schema";
import { create as createVercelProject } from "../vercel-project/create";
import type { SavedWorkflow, WorkflowData } from "./types";
import { getSession } from "./utils";

/**
 * Create a new workflow
 * Automatically creates a default project if user has none
 */
export async function create(
  data: Omit<WorkflowData, "id">
): Promise<SavedWorkflow> {
  const session = await getSession();

  if (!(data.name && data.nodes && data.edges)) {
    throw new Error("Name, nodes, and edges are required");
  }

  let projectId = data.vercelProjectId;

  // If no project specified, check if user has any projects
  if (!projectId) {
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, session.user.id),
      limit: 1,
    });

    // If user has no projects, create a default one
    if (userProjects.length === 0) {
      const defaultProject = await createVercelProject({
        name: "Untitled Project", // Display name (actual Vercel name will be workflow-builder-{projectId})
      });

      projectId = defaultProject.id;
    } else if (!projectId) {
      // Use the first existing project if no project specified
      projectId = userProjects[0].id;
    }
  }

  const [newWorkflow] = await db
    .insert(workflows)
    .values({
      name: data.name,
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      userId: session.user.id,
      vercelProjectId: projectId,
    })
    .returning();

  return newWorkflow as SavedWorkflow;
}
