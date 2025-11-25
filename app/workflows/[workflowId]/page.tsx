"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api-client";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  selectedExecutionIdAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
  type WorkflowNode,
  workflowNotFoundAtom,
} from "@/lib/workflow-store";

type WorkflowPageProps = {
  params: Promise<{ workflowId: string }>;
};

const WorkflowEditor = ({ params }: WorkflowPageProps) => {
  const { workflowId } = use(params);
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [_isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [selectedExecutionId, setSelectedExecutionId] = useAtom(
    selectedExecutionIdAtom
  );
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowId = useSetAtom(currentWorkflowIdAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const [workflowNotFound, setWorkflowNotFound] = useAtom(workflowNotFoundAtom);
  const setActiveTab = useSetAtom(propertiesPanelActiveTabAtom);

  // Ref to track polling interval
  const executionPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track polling interval for selected execution
  const selectedExecutionPollingIntervalRef = useRef<NodeJS.Timeout | null>(
    null
  );
  // Ref to access current nodes without triggering effect re-runs
  const nodesRef = useRef(nodes);

  // Keep nodes ref in sync
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Helper function to generate workflow from AI
  const generateWorkflowFromAI = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setCurrentWorkflowId(workflowId);
      setCurrentWorkflowName("AI Generated Workflow");

      try {
        const workflowData = await api.ai.generate(prompt);

        setNodes(workflowData.nodes || []);
        setEdges(workflowData.edges || []);
        setCurrentWorkflowName(workflowData.name || "AI Generated Workflow");

        const selectedNode = workflowData.nodes?.find(
          (n: { selected?: boolean }) => n.selected
        );
        if (selectedNode) {
          setSelectedNodeId(selectedNode.id);
        }

        await api.workflow.update(workflowId, {
          name: workflowData.name,
          description: workflowData.description,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        });
      } catch (error) {
        console.error("Failed to generate workflow:", error);
        toast.error("Failed to generate workflow");
      } finally {
        setIsGenerating(false);
      }
    },
    [
      workflowId,
      setIsGenerating,
      setCurrentWorkflowId,
      setCurrentWorkflowName,
      setNodes,
      setEdges,
      setSelectedNodeId,
    ]
  );

  // Helper function to load existing workflow
  const loadExistingWorkflow = useCallback(async () => {
    try {
      const workflow = await api.workflow.getById(workflowId);

      if (!workflow) {
        setWorkflowNotFound(true);
        return;
      }

      // Reset all node statuses to idle when loading from database
      const nodesWithIdleStatus = workflow.nodes.map((node: WorkflowNode) => ({
        ...node,
        data: {
          ...node.data,
          status: "idle" as const,
        },
      }));

      setNodes(nodesWithIdleStatus);
      setEdges(workflow.edges);
      setCurrentWorkflowId(workflow.id);
      setCurrentWorkflowName(workflow.name);
      setHasUnsavedChanges(false);
      setWorkflowNotFound(false);

      const selectedNode = workflow.nodes.find((n: WorkflowNode) => n.selected);
      if (selectedNode) {
        setSelectedNodeId(selectedNode.id);
      }
    } catch (error) {
      console.error("Failed to load workflow:", error);
      toast.error("Failed to load workflow");
    }
  }, [
    workflowId,
    setNodes,
    setEdges,
    setCurrentWorkflowId,
    setCurrentWorkflowName,
    setHasUnsavedChanges,
    setWorkflowNotFound,
    setSelectedNodeId,
  ]);

  useEffect(() => {
    const loadWorkflowData = async () => {
      const isGeneratingParam = searchParams?.get("generating") === "true";
      const storedPrompt = sessionStorage.getItem("ai-prompt");
      const storedWorkflowId = sessionStorage.getItem("generating-workflow-id");

      // Check if state is already loaded for this workflow
      if (currentWorkflowId === workflowId && nodes.length > 0) {
        return;
      }

      // Check if we should generate from AI
      if (
        isGeneratingParam &&
        storedPrompt &&
        storedWorkflowId === workflowId
      ) {
        sessionStorage.removeItem("ai-prompt");
        sessionStorage.removeItem("generating-workflow-id");
        await generateWorkflowFromAI(storedPrompt);
      } else {
        await loadExistingWorkflow();
      }
    };

    loadWorkflowData();
  }, [
    workflowId,
    searchParams,
    currentWorkflowId,
    nodes.length,
    generateWorkflowFromAI,
    loadExistingWorkflow,
  ]);

  // Keyboard shortcuts
  const handleSave = useCallback(async () => {
    if (!currentWorkflowId || isGenerating) {
      return;
    }
    setIsSaving(true);
    try {
      await api.workflow.update(currentWorkflowId, { nodes, edges });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [
    currentWorkflowId,
    nodes,
    edges,
    isGenerating,
    setIsSaving,
    setHasUnsavedChanges,
  ]);

  // Helper to update node statuses
  const updateAllNodeStatuses = useCallback(
    (status: "idle" | "error" | "success") => {
      for (const node of nodes) {
        updateNodeData({ id: node.id, data: { status } });
      }
    },
    [nodes, updateNodeData]
  );

  // Helper to poll execution status
  const pollExecutionStatus = useCallback(
    async (executionId: string) => {
      try {
        const statusData = await api.workflow.getExecutionStatus(executionId);

        // Update node statuses based on the execution logs
        for (const nodeStatus of statusData.nodeStatuses) {
          updateNodeData({
            id: nodeStatus.nodeId,
            data: {
              status: nodeStatus.status as
                | "idle"
                | "running"
                | "success"
                | "error",
            },
          });
        }

        // Return status and whether execution is complete
        return {
          isComplete: statusData.status !== "running",
          status: statusData.status,
        };
      } catch (error) {
        console.error("Failed to poll execution status:", error);
        return { isComplete: false, status: "running" };
      }
    },
    [updateNodeData]
  );

  const handleRun = useCallback(async () => {
    if (
      isExecuting ||
      nodes.length === 0 ||
      isGenerating ||
      !currentWorkflowId
    ) {
      return;
    }

    // Switch to Runs tab when starting a test run
    setActiveTab("runs");

    // Deselect all nodes and edges
    setNodes(nodes.map((node) => ({ ...node, selected: false })));
    setEdges(edges.map((edge) => ({ ...edge, selected: false })));
    setSelectedNodeId(null);

    setIsExecuting(true);

    // Set all nodes to idle first
    updateAllNodeStatuses("idle");

    // Immediately set trigger nodes to running for instant visual feedback
    for (const node of nodes) {
      if (node.data.type === "trigger") {
        updateNodeData({ id: node.id, data: { status: "running" } });
      }
    }

    try {
      // Start the execution via API
      const response = await fetch(
        `/api/workflow/${currentWorkflowId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: {} }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to execute workflow");
      }

      const result = await response.json();

      // Select the new execution
      setSelectedExecutionId(result.executionId);

      // Poll for execution status updates
      const pollInterval = setInterval(async () => {
        const { isComplete } = await pollExecutionStatus(result.executionId);

        if (isComplete) {
          if (executionPollingIntervalRef.current) {
            clearInterval(executionPollingIntervalRef.current);
            executionPollingIntervalRef.current = null;
          }

          setIsExecuting(false);

          // Don't reset node statuses - let them show the final state
          // The user can click another run or deselect to reset
        }
      }, 500); // Poll every 500ms

      executionPollingIntervalRef.current = pollInterval;
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to execute workflow"
      );
      updateAllNodeStatuses("error");
      setIsExecuting(false);
    }
  }, [
    isExecuting,
    nodes,
    edges,
    isGenerating,
    currentWorkflowId,
    setIsExecuting,
    updateAllNodeStatuses,
    pollExecutionStatus,
    updateNodeData,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
  ]);

  // Helper to check if target is an input element
  const isInputElement = useCallback(
    (target: HTMLElement) =>
      target.tagName === "INPUT" || target.tagName === "TEXTAREA",
    []
  );

  // Helper to check if we're in Monaco editor
  const isInMonacoEditor = useCallback(
    (target: HTMLElement) => target.closest(".monaco-editor") !== null,
    []
  );

  // Helper to handle save shortcut
  const handleSaveShortcut = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return true;
      }
      return false;
    },
    [handleSave]
  );

  // Helper to handle run shortcut
  const handleRunShortcut = useCallback(
    (e: KeyboardEvent, target: HTMLElement) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!(isInputElement(target) || isInMonacoEditor(target))) {
          e.preventDefault();
          e.stopPropagation();
          handleRun();
        }
        return true;
      }
      return false;
    },
    [handleRun, isInputElement, isInMonacoEditor]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Handle save shortcut
      if (handleSaveShortcut(e)) {
        return;
      }

      // Handle run shortcut
      if (handleRunShortcut(e, target)) {
        return;
      }
    };

    // Use capture phase only to ensure we can intercept before other handlers
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSaveShortcut, handleRunShortcut]);

  // Cleanup polling interval on unmount
  useEffect(
    () => () => {
      if (executionPollingIntervalRef.current) {
        clearInterval(executionPollingIntervalRef.current);
      }
      if (selectedExecutionPollingIntervalRef.current) {
        clearInterval(selectedExecutionPollingIntervalRef.current);
      }
    },
    []
  );

  // Poll for selected execution status
  useEffect(() => {
    // Clear existing interval if any
    if (selectedExecutionPollingIntervalRef.current) {
      clearInterval(selectedExecutionPollingIntervalRef.current);
      selectedExecutionPollingIntervalRef.current = null;
    }

    // If no execution is selected or it's the currently running one, don't poll
    if (!selectedExecutionId) {
      // Reset all node statuses when no execution is selected
      for (const node of nodesRef.current) {
        updateNodeData({ id: node.id, data: { status: "idle" } });
      }
      return;
    }

    // Start polling for the selected execution
    const pollSelectedExecution = async () => {
      try {
        const statusData =
          await api.workflow.getExecutionStatus(selectedExecutionId);

        // Update node statuses based on the execution logs
        for (const nodeStatus of statusData.nodeStatuses) {
          updateNodeData({
            id: nodeStatus.nodeId,
            data: {
              status: nodeStatus.status as
                | "idle"
                | "running"
                | "success"
                | "error",
            },
          });
        }

        // Stop polling if execution is complete
        if (
          statusData.status !== "running" &&
          selectedExecutionPollingIntervalRef.current
        ) {
          clearInterval(selectedExecutionPollingIntervalRef.current);
          selectedExecutionPollingIntervalRef.current = null;
        }
      } catch (error) {
        console.error("Failed to poll selected execution status:", error);
        // Clear polling on error
        if (selectedExecutionPollingIntervalRef.current) {
          clearInterval(selectedExecutionPollingIntervalRef.current);
          selectedExecutionPollingIntervalRef.current = null;
        }
      }
    };

    // Poll immediately and then every 500ms
    pollSelectedExecution();
    const pollInterval = setInterval(pollSelectedExecution, 500);
    selectedExecutionPollingIntervalRef.current = pollInterval;

    return () => {
      if (selectedExecutionPollingIntervalRef.current) {
        clearInterval(selectedExecutionPollingIntervalRef.current);
        selectedExecutionPollingIntervalRef.current = null;
      }
    };
  }, [selectedExecutionId, updateNodeData]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <main className="relative flex size-full overflow-hidden">
        <ReactFlowProvider>
          {isMobile ? (
            <div className="relative size-full overflow-hidden">
              <WorkflowToolbar workflowId={workflowId} />
              <WorkflowCanvas />

              {workflowNotFound && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-lg border bg-background p-8 text-center shadow-lg">
                    <h1 className="mb-2 font-semibold text-2xl">
                      Workflow Not Found
                    </h1>
                    <p className="mb-6 text-muted-foreground">
                      The workflow you're looking for doesn't exist or has been
                      deleted.
                    </p>
                    <Button asChild>
                      <Link href="/">New Workflow</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="relative size-full overflow-hidden">
                  <WorkflowToolbar workflowId={workflowId} />
                  <WorkflowCanvas />

                  {workflowNotFound && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-lg border bg-background p-8 text-center shadow-lg">
                        <h1 className="mb-2 font-semibold text-2xl">
                          Workflow Not Found
                        </h1>
                        <p className="mb-6 text-muted-foreground">
                          The workflow you're looking for doesn't exist or has
                          been deleted.
                        </p>
                        <Button asChild>
                          <Link href="/">New Workflow</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} maxSize={50} minSize={20}>
                <NodeConfigPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </ReactFlowProvider>
      </main>
    </div>
  );
};

const WorkflowPage = ({ params }: WorkflowPageProps) => (
  <WorkflowEditor params={params} />
);

export default WorkflowPage;
