import { WorkflowPrompt } from '@/components/workflows/workflow-prompt';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { workflowApi } from '@/lib/workflow-api';

export const WorkflowIndexPrompt = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const handleNewWorkflow = async () => {
    // Check if user is logged in
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const newWorkflow = await workflowApi.create({
        name: 'Untitled',
        description: '',
        nodes: [],
        edges: [],
      });
      router.push(`/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error('Failed to create workflow. Please try again.');
    }
  };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold">Workflow Builder Template</h1>
            <p className="text-muted-foreground text-sm">
              Powered by{' '}
              <a
                href="https://useworkflow.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Workflow
              </a>
              ,{' '}
              <a
                href="https://ai-sdk.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                AI SDK
              </a>
              ,{' '}
              <a
                href="https://vercel.com/ai-gateway"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                AI Gateway
              </a>
              , and{' '}
              <a
                href="https://ai-sdk.dev/elements"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                AI Elements
              </a>
            </p>
          </div>
          <WorkflowPrompt />
          <div className="flex justify-center mt-4">
            <Button variant="link" size="sm" onClick={handleNewWorkflow}>
              or start from scratch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};