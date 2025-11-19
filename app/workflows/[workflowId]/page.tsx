"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { generate } from "@/app/actions/ai/generate";
import { getProjectIntegrations } from "@/app/actions/vercel-project/get-integrations";
import { execute } from "@/app/actions/workflow/execute";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NodeConfigPanel } from "@/components/workflow/node-config-panel";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { projectIntegrationsAtom } from "@/lib/integrations-store";
import { workflowApi } from "@/lib/workflow-api";
import {
  currentVercelProjectIdAtom,
  currentVercelProjectNameAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  nodesAtom,
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
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [_isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowId = useSetAtom(currentWorkflowIdAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setCurrentVercelProjectId = useSetAtom(currentVercelProjectIdAtom);
  const setCurrentVercelProjectName = useSetAtom(currentVercelProjectNameAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const [workflowNotFound, setWorkflowNotFound] = useAtom(workflowNotFoundAtom);
  const setProjectIntegrations = useSetAtom(projectIntegrationsAtom);

  // Load project integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const workflow = await workflowApi.getById(workflowId);
        if (workflow?.vercelProjectId) {
          // Find the project by vercelProjectId
          const { getProjectByVercelId } = await import("@/app/actions/project/get-by-vercel-id");
          const project = await getProjectByVercelId(workflow.vercelProjectId);
          if (project) {
            const integrations = await getProjectIntegrations(project.id);
            setProjectIntegrations(integrations);
          }
        }
      } catch (error) {
        console.error("Failed to load integrations:", error);
      }
    };

    loadIntegrations();
  }, [workflowId, setProjectIntegrations]);

  // Helper function to generate workflow from AI
  const generateWorkflowFromAI = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setCurrentWorkflowId(workflowId);
      setCurrentWorkflowName("AI Generated Workflow");

      try {
        const workflowData = await generate(prompt);

        setNodes(workflowData.nodes || []);
        setEdges(workflowData.edges || []);
        setCurrentWorkflowName(workflowData.name || "AI Generated Workflow");

        const selectedNode = workflowData.nodes?.find(
          (n: { selected?: boolean }) => n.selected,
        );
        if (selectedNode) {
          setSelectedNodeId(selectedNode.id);
        }

        await workflowApi.update(workflowId, {
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
    ],
  );

  // Helper function to load existing workflow
  const loadExistingWorkflow = useCallback(async () => {
    try {
      const workflow = await workflowApi.getById(workflowId);

      if (!workflow) {
        setWorkflowNotFound(true);
        return;
      }

      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setCurrentWorkflowId(workflow.id);
      setCurrentWorkflowName(workflow.name);
      setCurrentVercelProjectId(workflow.vercelProjectId || null);
      setCurrentVercelProjectName(workflow.vercelProject?.name || null);
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
    setCurrentVercelProjectId,
    setCurrentVercelProjectName,
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
      await workflowApi.update(currentWorkflowId, { nodes, edges });
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
    [nodes, updateNodeData],
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

    setIsExecuting(true);

    // Set all nodes to idle first
    updateAllNodeStatuses("idle");

    try {
      const result = await execute(currentWorkflowId, {});

      if (result.status === "error") {
        toast.error(result.error || "Workflow execution failed");
      } else {
        toast.success("Test run completed successfully");
      }

      // Update all nodes based on result
      const resultStatus: "idle" | "running" | "success" | "error" =
        result.status === "error" ? "error" : "success";
      updateAllNodeStatuses(resultStatus);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to execute workflow",
      );
      updateAllNodeStatuses("error");
    } finally {
      setIsExecuting(false);
    }
  }, [
    isExecuting,
    nodes.length,
    isGenerating,
    currentWorkflowId,
    setIsExecuting,
    updateAllNodeStatuses,
  ]);

  // Helper to check if target is an input element
  const isInputElement = useCallback(
    (target: HTMLElement) =>
      target.tagName === "INPUT" || target.tagName === "TEXTAREA",
    [],
  );

  // Helper to check if we're in Monaco editor
  const isInMonacoEditor = useCallback(
    (target: HTMLElement) => target.closest(".monaco-editor") !== null,
    [],
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
    [handleSave],
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
    [handleRun, isInputElement, isInMonacoEditor],
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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <main className="relative flex size-full overflow-hidden">
        <ReactFlowProvider>
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
        </ReactFlowProvider>
      </main>
    </div>
  );
};

const WorkflowPage = ({ params }: WorkflowPageProps) => (
  <WorkflowEditor params={params} />
);

export default WorkflowPage;
