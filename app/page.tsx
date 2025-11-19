"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { authClient, useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  nodesAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";

// Helper function to create a default trigger node
function createDefaultTriggerNode() {
  return {
    id: nanoid(),
    type: "trigger" as const,
    position: { x: 0, y: 0 },
    data: {
      label: "Trigger",
      description: "Start your workflow",
      type: "trigger" as const,
      config: { triggerType: "Manual" },
      status: "idle" as const,
    },
  };
}

const Home = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const currentWorkflowId = useAtomValue(currentWorkflowIdAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const hasCreatedWorkflowRef = useRef(false);
  const currentWorkflowName = useAtomValue(currentWorkflowNameAtom);

  // Update page title when workflow name changes
  useEffect(() => {
    document.title = `${currentWorkflowName} - Workflow Builder`;
  }, [currentWorkflowName]);

  // Helper to create anonymous session if needed
  const ensureSession = useCallback(async () => {
    if (!session) {
      await authClient.signIn.anonymous();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, [session]);

  // Handler to add the first node (replaces the "add" node)
  const handleAddNode = useCallback(() => {
    const newNode: WorkflowNode = createDefaultTriggerNode();
    // Replace all nodes (removes the "add" node)
    setNodes([newNode]);
  }, [setNodes]);

  // Initialize with a temporary "add" node on mount
  useEffect(() => {
    const addNodePlaceholder: WorkflowNode = {
      id: "add-node-placeholder",
      type: "add",
      position: { x: 0, y: 0 },
      data: {
        label: "",
        type: "add",
        onClick: handleAddNode,
      },
      draggable: false,
      selectable: false,
    };
    setNodes([addNodePlaceholder]);
    setEdges([]);
    setCurrentWorkflowName("Untitled Workflow");
    hasCreatedWorkflowRef.current = false;
  }, [setNodes, setEdges, setCurrentWorkflowName, handleAddNode]);

  // Create workflow when first real node is added
  useEffect(() => {
    const createWorkflowAndRedirect = async () => {
      // Filter out the placeholder "add" node
      const realNodes = nodes.filter((node) => node.type !== "add");

      // Only create when we have at least one real node and haven't created a workflow yet
      if (realNodes.length === 0 || hasCreatedWorkflowRef.current) {
        return;
      }
      hasCreatedWorkflowRef.current = true;

      try {
        await ensureSession();

        // Create workflow with all real nodes
        const newWorkflow = await workflowApi.create({
          name: "Untitled Workflow",
          description: "",
          nodes: realNodes,
          edges,
        });

        // Redirect to the workflow page
        router.replace(`/workflows/${newWorkflow.id}`);
      } catch (error) {
        console.error("Failed to create workflow:", error);
        toast.error("Failed to create workflow");
      }
    };

    createWorkflowAndRedirect();
  }, [nodes, edges, router, ensureSession]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <main className="relative flex size-full overflow-hidden">
        <ReactFlowProvider>
          <div className="relative flex-1 overflow-hidden">
            <WorkflowToolbar workflowId={currentWorkflowId ?? undefined} />
            <WorkflowCanvas showMinimap={false} />
          </div>
        </ReactFlowProvider>
      </main>
    </div>
  );
};

export default Home;
