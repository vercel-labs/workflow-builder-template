import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, vercelProjects } from "@/lib/db/schema";
import { createProject, listProjects } from "@/lib/integrations/vercel";

/**
 * GET /api/user/vercel-projects
 * Fetch Vercel projects from the Vercel API and sync with local database
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        vercelApiToken: true,
        vercelTeamId: true,
      },
    });

    if (!userData?.vercelApiToken) {
      return NextResponse.json(
        { error: "Vercel API token not configured" },
        { status: 400 }
      );
    }

    // Fetch projects from Vercel API
    const result = await listProjects({
      apiToken: userData.vercelApiToken,
      teamId: userData.vercelTeamId || undefined,
    });

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
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

    return NextResponse.json({ projects: localProjects });
  } catch (error) {
    console.error("Failed to fetch Vercel projects:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Vercel projects",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/vercel-projects
 * Create a new Vercel project (creates actual project on Vercel if API token is configured)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, framework } = body;

    if (!(name && name.trim())) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        vercelApiToken: true,
        vercelTeamId: true,
      },
    });

    let vercelProjectId: string;
    let actualFramework: string | null = framework || null;

    // If user has Vercel API token configured, create a real project on Vercel
    if (userData?.vercelApiToken) {
      const result = await createProject({
        name: name.trim(),
        apiToken: userData.vercelApiToken,
        teamId: userData.vercelTeamId || undefined,
        framework: framework || undefined,
      });

      if (result.status === "error") {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      if (!result.project) {
        return NextResponse.json(
          { error: "Failed to create project on Vercel" },
          { status: 500 }
        );
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
        name: name.trim(),
        vercelProjectId,
        framework: actualFramework,
      })
      .returning();

    return NextResponse.json({ project: newProject });
  } catch (error) {
    console.error("Failed to create Vercel project:", error);
    return NextResponse.json(
      {
        error: "Failed to create Vercel project",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/vercel-projects?id=projectId
 * Remove a Vercel project from local database (doesn't delete from Vercel)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get("id");
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 }
      );
    }

    await db
      .delete(vercelProjects)
      .where(
        and(
          eq(vercelProjects.id, projectId),
          eq(vercelProjects.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Vercel project:", error);
    return NextResponse.json(
      {
        error: "Failed to delete Vercel project",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
