"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { authClient, useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";
import {
  currentVercelProjectNameAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  isExecutingAtom,
  isLoadingAtom,
  nodesAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";

const Home = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [currentWorkflowId, setCurrentWorkflowId] = useAtom(
    currentWorkflowIdAtom
  );
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setCurrentVercelProjectName = useSetAtom(currentVercelProjectNameAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const hasRedirectedRef = useRef(false);
  const hasInitialized = useRef(false);

  // Initialize state on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setIsLoading(false);
    }
  }, [setIsLoading]);

  // Create workflow and redirect when first node is added
  useEffect(() => {
    const createWorkflowAndRedirect = async () => {
      // Only run when nodes are added and we haven't redirected yet
      if (nodes.length === 0 || hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;

      try {
        setIsLoading(true);
        
        // If no session, create anonymous session first
        if (!session) {
          await authClient.signIn.anonymous();
          // Wait a moment for session to be established
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create workflow with the first node
        const newWorkflow = await workflowApi.create({
          name: "Untitled Workflow",
          description: "",
          nodes,
          edges,
        });
        
        // Set the workflow ID and name
        setCurrentWorkflowId(newWorkflow.id);
        setCurrentWorkflowName(newWorkflow.name);
        
        // If the workflow has a project, we need to load it to get the name
        if (newWorkflow.vercelProjectId) {
          const fullWorkflow = await workflowApi.getById(newWorkflow.id);
          console.log('[Home] fullWorkflow:', fullWorkflow);
          console.log('[Home] fullWorkflow.vercelProject:', fullWorkflow.vercelProject);
          if (fullWorkflow.vercelProject) {
            console.log('[Home] Setting project name to:', fullWorkflow.vercelProject.name);
            setCurrentVercelProjectName(fullWorkflow.vercelProject.name);
          }
        }
        
        // Redirect to the workflow page
        router.replace(`/workflows/${newWorkflow.id}?skipLoad=true`);
      } catch (error) {
        console.error("Failed to create workflow:", error);
        toast.error("Failed to create workflow");
        setIsLoading(false);
      }
    };

    createWorkflowAndRedirect();
  }, [nodes, edges, router, session, setIsLoading]);

  // Keyboard shortcuts
  const handleSave = useCallback(async () => {
    if (!currentWorkflowId) return;
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      toast.success("Workflow saved");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow");
    }
  }, [currentWorkflowId, nodes, edges]);

  const handleRun = useCallback(async () => {
    if (isExecuting || nodes.length === 0 || !currentWorkflowId) return;

    setIsExecuting(true);

    // Set all nodes to idle first
    nodes.forEach((node) => {
      updateNodeData({ id: node.id, data: { status: "idle" } });
    });

    try {
      // Call the server API to execute the workflow
      const response = await fetch(
        `/api/workflows/${currentWorkflowId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: {} }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to execute workflow");
      }

      const result = await response.json();

      // Update all nodes based on result
      nodes.forEach((node) => {
        updateNodeData({
          id: node.id,
          data: { status: result.status === "error" ? "error" : "success" },
        });
      });
    } catch (error) {
      console.error("Failed to execute workflow:", error);

      // Mark all nodes as error
      nodes.forEach((node) => {
        updateNodeData({ id: node.id, data: { status: "error" } });
      });
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, nodes, currentWorkflowId, setIsExecuting, updateNodeData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Cmd+S or Ctrl+S to save (works everywhere, including inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return;
      }

      // Cmd+Enter or Ctrl+Enter to run (skip if typing in input/textarea)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
          handleRun();
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSave, handleRun]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <main className="relative size-full overflow-hidden">
        <ReactFlowProvider>
          <WorkflowToolbar workflowId={currentWorkflowId ?? undefined} />
          <WorkflowCanvas />
        </ReactFlowProvider>
      </main>
      <NodeConfigPanel />
    </div>
  );
};

export default Home;
