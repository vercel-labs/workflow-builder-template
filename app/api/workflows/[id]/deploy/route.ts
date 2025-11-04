import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { workflows, user, vercelProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { deployWorkflowToVercel } from '@/lib/vercel-deployment';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workflow
    const workflow = await db.query.workflows.findFirst({
      where: and(eq(workflows.id, id), eq(workflows.userId, session.user.id)),
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Get user's Vercel credentials
    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        vercelApiToken: true,
        vercelTeamId: true,
      },
    });

    if (!userData?.vercelApiToken) {
      return NextResponse.json(
        { error: 'Vercel API token not configured. Please configure in settings.' },
        { status: 400 }
      );
    }

    // Check if workflow is linked to a Vercel project
    if (!workflow.vercelProjectId) {
      return NextResponse.json(
        {
          error:
            'This workflow is not linked to a Vercel project. Please link it to a project first using the "Change Project" option.',
        },
        { status: 400 }
      );
    }

    // Get the actual Vercel project to verify it's a real Vercel project
    const vercelProject = await db.query.vercelProjects.findFirst({
      where: eq(vercelProjects.id, workflow.vercelProjectId),
    });

    if (!vercelProject) {
      return NextResponse.json(
        {
          error: 'Linked Vercel project not found. Please link this workflow to a valid project.',
        },
        { status: 400 }
      );
    }

    // Check if it's a local (fake) project
    if (vercelProject.vercelProjectId.startsWith('local-')) {
      return NextResponse.json(
        {
          error:
            'This workflow is linked to a local project that does not exist on Vercel. ' +
            'Please configure your Vercel API token in settings, then create a new Vercel project or link to an existing one.',
        },
        { status: 400 }
      );
    }

    // Update status to deploying
    await db.update(workflows).set({ deploymentStatus: 'deploying' }).where(eq(workflows.id, id));

    // Deploy workflow using the actual Vercel project ID
    const result = await deployWorkflowToVercel({
      workflowId: workflow.id,
      workflowName: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      vercelToken: userData.vercelApiToken,
      vercelTeamId: userData.vercelTeamId || undefined,
      vercelProjectId: vercelProject.vercelProjectId, // Use the actual Vercel project ID
    });

    // Update workflow with deployment result
    await db
      .update(workflows)
      .set({
        deploymentStatus: result.success ? 'deployed' : 'failed',
        deploymentUrl: result.deploymentUrl,
        lastDeployedAt: new Date(),
      })
      .where(eq(workflows.id, id));

    return NextResponse.json({
      success: result.success,
      deploymentUrl: result.deploymentUrl,
      error: result.error,
      logs: result.logs,
    });
  } catch (error) {
    console.error('Deployment error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      },
      { status: 500 }
    );
  }
}
