import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { workflows } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateWorkflowSDKCode } from '@/lib/workflow-codegen-sdk';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Generate code
    const code = generateWorkflowSDKCode(workflow.name, workflow.nodes, workflow.edges);

    return NextResponse.json({
      code,
      workflowName: workflow.name,
    });
  } catch (error) {
    console.error('Error generating code:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate code',
      },
      { status: 500 }
    );
  }
}
