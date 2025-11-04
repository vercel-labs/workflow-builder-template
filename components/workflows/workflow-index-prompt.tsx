"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkflowPrompt } from "@/components/workflows/workflow-prompt";
import { useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";

export const WorkflowIndexPrompt = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const handleNewWorkflow = async () => {
    // Check if user is logged in
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const newWorkflow = await workflowApi.create({
        name: "Untitled",
        description: "",
        nodes: [],
        edges: [],
      });
      router.push(`/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("Failed to create workflow. Please try again.");
    }
  };

  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 z-10">
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-bold text-4xl">
              Workflow Builder Template
            </h1>
            <p className="text-muted-foreground text-sm">
              Powered by{" "}
              <a
                className="underline hover:no-underline"
                href="https://useworkflow.dev/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Workflow
              </a>
              ,{" "}
              <a
                className="underline hover:no-underline"
                href="https://ai-sdk.dev/"
                rel="noopener noreferrer"
                target="_blank"
              >
                AI SDK
              </a>
              ,{" "}
              <a
                className="underline hover:no-underline"
                href="https://vercel.com/ai-gateway"
                rel="noopener noreferrer"
                target="_blank"
              >
                AI Gateway
              </a>
              , and{" "}
              <a
                className="underline hover:no-underline"
                href="https://ai-sdk.dev/elements"
                rel="noopener noreferrer"
                target="_blank"
              >
                AI Elements
              </a>
            </p>
          </div>
          <WorkflowPrompt />
          <div className="mt-4 flex justify-center">
            <Button onClick={handleNewWorkflow} size="sm" variant="link">
              or start from scratch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
