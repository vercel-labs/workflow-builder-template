"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export interface ProjectIntegrations {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
}

export async function getProjectIntegrations(
  projectId: string
): Promise<ProjectIntegrations> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return {
    resendApiKey: project.resendApiKey || null,
    resendFromEmail: project.resendFromEmail || null,
    linearApiKey: project.linearApiKey || null,
    slackApiKey: project.slackApiKey || null,
    hasResendKey: !!project.resendApiKey,
    hasLinearKey: !!project.linearApiKey,
    hasSlackKey: !!project.slackApiKey,
  };
}

