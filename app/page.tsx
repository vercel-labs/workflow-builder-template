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
  currentVercelProjectIdAtom,
  currentVercelProjectNameAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  isExecutingAtom,
  isSavingAtom,
  nodesAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";

const Home = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [_isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [currentWorkflowId, setCurrentWorkflowId] = useAtom(
    currentWorkflowIdAtom
  );
  const _setNodes = useSetAtom(nodesAtom);
  const _setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowName = useSetAtom(currentWorkflowNameAtom);
  const setCurrentVercelProjectId = useSetAtom(currentVercelProjectIdAtom);
  const setCurrentVercelProjectName = useSetAtom(currentVercelProjectNameAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const _setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const hasRedirectedRef = useRef(false);

  // Helper to create anonymous session if needed
  const ensureSession = useCallback(async () => {
    if (!session) {
      await authClient.signIn.anonymous();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, [session]);

  // Helper to load project details if workflow has one
  const loadProjectDetails = useCallback(
    async (workflowId: string, _projectId: string) => {
      const fullWorkflow = await workflowApi.getById(workflowId);
      if (fullWorkflow?.vercelProject) {
        setCurrentVercelProjectId(fullWorkflow.vercelProject.id);
        setCurrentVercelProjectName(fullWorkflow.vercelProject.name);
      }
    },
    [setCurrentVercelProjectId, setCurrentVercelProjectName]
  );

  // Create workflow and redirect when first node is added
  useEffect(() => {
    const createWorkflowAndRedirect = async () => {
      // Only run when nodes are added and we haven't redirected yet
      if (nodes.length === 0 || hasRedirectedRef.current) {
        return;
      }
      hasRedirectedRef.current = true;

      try {
        await ensureSession();

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

        // Load project details if available
        if (newWorkflow.vercelProjectId) {
          await loadProjectDetails(newWorkflow.id, newWorkflow.vercelProjectId);
        }

        // Redirect to the workflow page
        router.replace(`/workflows/${newWorkflow.id}`);
      } catch (error) {
        console.error("Failed to create workflow:", error);
        toast.error("Failed to create workflow");
      }
    };

    createWorkflowAndRedirect();
  }, [
    nodes,
    edges,
    router,
    ensureSession,
    loadProjectDetails,
    setCurrentWorkflowId,
    setCurrentWorkflowName,
  ]);

  // Keyboard shortcuts
  const handleSave = useCallback(async () => {
    if (!currentWorkflowId) {
      return;
    }
    setIsSaving(true);
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      toast.success("Workflow saved");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [currentWorkflowId, nodes, edges, setIsSaving]);

  // Helper to update node statuses
  const updateAllNodeStatuses = useCallback(
    (status: "idle" | "error" | "success") => {
      for (const node of nodes) {
        updateNodeData({ id: node.id, data: { status } });
      }
    },
    [nodes, updateNodeData]
  );

  // Helper to execute workflow API call
  const executeWorkflowApi = useCallback(async (workflowId: string) => {
    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to execute workflow");
    }

    return await response.json();
  }, []);

  const handleRun = useCallback(async () => {
    if (isExecuting || nodes.length === 0 || !currentWorkflowId) {
      return;
    }

    setIsExecuting(true);

    // Set all nodes to idle first
    updateAllNodeStatuses("idle");

    try {
      const result = await executeWorkflowApi(currentWorkflowId);

      // Update all nodes based on result
      const resultStatus = result.status === "error" ? "error" : "success";
      updateAllNodeStatuses(resultStatus);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      updateAllNodeStatuses("error");
    } finally {
      setIsExecuting(false);
    }
  }, [
    isExecuting,
    nodes.length,
    currentWorkflowId,
    setIsExecuting,
    updateAllNodeStatuses,
    executeWorkflowApi,
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
