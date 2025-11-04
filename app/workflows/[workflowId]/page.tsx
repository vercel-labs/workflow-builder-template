"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Provider, useAtom, useSetAtom } from "jotai";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { NodeToolbar } from "@/components/workflow/node-toolbar";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { workflowApi } from "@/lib/workflow-api";
import {
  currentVercelProjectNameAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isLoadingAtom,
  nodesAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";

function WorkflowEditor({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = use(params);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowId = useSetAtom(currentWorkflowIdAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setCurrentVercelProjectName = useSetAtom(currentVercelProjectNameAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);

  useEffect(() => {
    const loadWorkflowData = async () => {
      const isGeneratingParam = searchParams?.get("generating") === "true";
      const storedPrompt = sessionStorage.getItem("ai-prompt");
      const storedWorkflowId = sessionStorage.getItem("generating-workflow-id");

      // Check if we should generate
      if (
        isGeneratingParam &&
        storedPrompt &&
        storedWorkflowId === workflowId
      ) {
        // Clear session storage
        sessionStorage.removeItem("ai-prompt");
        sessionStorage.removeItem("generating-workflow-id");

        // Set generating state
        setIsGenerating(true);
        setCurrentWorkflowId(workflowId);
        setCurrentWorkflowName("AI Generated Workflow");

        try {
          // Stream the AI response
          const response = await fetch("/api/ai/generate-workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: storedPrompt }),
          });

          if (!response.ok) {
            throw new Error("Failed to generate workflow");
          }

          const workflowData = await response.json();

          // Update nodes and edges as they come in
          setNodes(workflowData.nodes || []);
          setEdges(workflowData.edges || []);
          setCurrentWorkflowName(workflowData.name || "AI Generated Workflow");

          // Sync selected node if any node is selected
          const selectedNode = workflowData.nodes?.find(
            (n: { selected?: boolean }) => n.selected
          );
          if (selectedNode) {
            setSelectedNodeId(selectedNode.id);
          }

          // Save to database
          await workflowApi.update(workflowId, {
            name: workflowData.name,
            description: workflowData.description,
            nodes: workflowData.nodes,
            edges: workflowData.edges,
          });
        } catch (error) {
          console.error("Failed to generate workflow:", error);
          alert("Failed to generate workflow");
        } finally {
          setIsGenerating(false);
        }
      } else {
        // Normal workflow loading
        try {
          setIsLoading(true);
          const workflow = await workflowApi.getById(workflowId);
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          setCurrentWorkflowId(workflow.id);
          setCurrentWorkflowName(workflow.name);
          setCurrentVercelProjectName(workflow.vercelProject?.name || null);

          // Sync selected node if any node is selected
          const selectedNode = workflow.nodes.find((n) => n.selected);
          if (selectedNode) {
            setSelectedNodeId(selectedNode.id);
          }
        } catch (error) {
          console.error("Failed to load workflow:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadWorkflowData();
  }, [
    workflowId,
    searchParams,
    setCurrentWorkflowId,
    setCurrentWorkflowName,
    setCurrentVercelProjectName,
    setNodes,
    setEdges,
    setIsLoading,
    setIsGenerating,
    setSelectedNodeId,
  ]);

  // Keyboard shortcuts
  const handleSave = useCallback(async () => {
    if (!currentWorkflowId || isGenerating) return;
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      const { toast } = await import("sonner");
      toast.success("Workflow saved");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to save workflow");
    }
  }, [currentWorkflowId, nodes, edges, isGenerating]);

  const handleRun = useCallback(async () => {
    if (isExecuting || nodes.length === 0 || isGenerating || !currentWorkflowId)
      return;

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
  }, [
    isExecuting,
    nodes,
    isGenerating,
    currentWorkflowId,
    setIsExecuting,
    updateNodeData,
  ]);

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-semibold text-lg">Loading workflow...</div>
          <div className="text-muted-foreground text-sm">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <WorkflowToolbar workflowId={workflowId} />
      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          <ReactFlowProvider>
            <WorkflowCanvas />
            <NodeToolbar />
          </ReactFlowProvider>
        </main>
        <NodeConfigPanel />
      </div>
    </div>
  );
}

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  return (
    <Provider>
      <AuthProvider>
        <WorkflowEditor params={params} />
      </AuthProvider>
    </Provider>
  );
}
