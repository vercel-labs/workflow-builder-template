"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FlaskConical,
  Loader2,
  Play,
  Redo2,
  Rocket,
  Save,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deploy } from "@/app/actions/workflow/deploy";
import { prepareWorkflowDownload } from "@/app/actions/workflow/download";
import { getDeploymentStatus } from "@/app/actions/workflow/get-deployment-status";
import { getExecutionStatus } from "@/app/actions/workflow/get-execution-status";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { VERCEL_DEPLOY_URL } from "@/lib/constants";
import { workflowApi } from "@/lib/workflow-api";
import {
  canRedoAtom,
  canUndoAtom,
  clearWorkflowAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  nodesAtom,
  redoAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  undoAtom,
  updateNodeDataAtom,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { GitHubStarsButton } from "../github-stars-button";
import { WorkflowIcon } from "../ui/workflow-icon";
import { UserMenu } from "../workflows/user-menu";

type WorkflowToolbarProps = {
  workflowId?: string;
};

// Helper functions to reduce complexity
function updateNodesStatus(
  nodes: WorkflowNode[],
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void,
  status: "idle" | "running" | "success" | "error"
) {
  for (const node of nodes) {
    updateNodeData({ id: node.id, data: { status } });
  }
}

async function triggerProductionWorkflow(
  workflowName: string,
  deploymentUrl: string
) {
  const workflowFileName = workflowName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const workflowApiUrl = `${deploymentUrl}/api/workflows/${workflowFileName}`;

  const response = await fetch(workflowApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error("Failed to trigger production workflow");
  }

  return response.json();
}

type ExecuteTestWorkflowParams = {
  workflowId: string;
  nodes: WorkflowNode[];
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  setIsExecuting: (value: boolean) => void;
};

async function executeTestWorkflow({
  workflowId,
  nodes,
  updateNodeData,
  pollingIntervalRef,
  setIsExecuting,
}: ExecuteTestWorkflowParams) {
  // Set all nodes to idle first
  updateNodesStatus(nodes, updateNodeData, "idle");

  // Immediately set trigger nodes to running for instant visual feedback
  for (const node of nodes) {
    if (node.data.type === "trigger") {
      updateNodeData({ id: node.id, data: { status: "running" } });
    }
  }

  try {
    // Start the execution via API
    const response = await fetch(`/api/workflow/${workflowId}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: {} }),
    });

    if (!response.ok) {
      throw new Error("Failed to execute workflow");
    }

    const result = await response.json();

    // Poll for execution status updates
    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getExecutionStatus(result.executionId);

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
        if (statusData.status !== "running") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          if (statusData.status === "error") {
            toast.error("Test run failed");
          } else {
            toast.success("Test run completed successfully");
          }

          setIsExecuting(false);

          // Reset node statuses after 5 seconds
          setTimeout(() => {
            updateNodesStatus(nodes, updateNodeData, "idle");
          }, 5000);
        }
      } catch (error) {
        console.error("Failed to poll execution status:", error);
      }
    }, 500); // Poll every 500ms

    pollingIntervalRef.current = pollInterval;
  } catch (error) {
    console.error("Failed to execute workflow:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to execute workflow"
    );
    updateNodesStatus(nodes, updateNodeData, "error");
    setIsExecuting(false);
  }
}

function showDeploymentSuccessToast(deploymentUrl: string) {
  toast.success(
    <div className="flex items-center gap-2">
      <span>Deployed to:</span>
      <a
        className="flex items-center gap-1 underline"
        href={deploymentUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {deploymentUrl}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>,
    { duration: 10_000 }
  );
}

// Hook for workflow handlers
type WorkflowHandlerParams = {
  currentWorkflowId: string | null;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  setIsExecuting: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  deploymentUrl: string | null;
};

function useWorkflowHandlers({
  currentWorkflowId,
  workflowName,
  nodes,
  edges,
  updateNodeData,
  setIsExecuting,
  setIsSaving,
  setHasUnsavedChanges,
  deploymentUrl,
}: WorkflowHandlerParams) {
  const [runMode, setRunMode] = useState<"test" | "production">("test");
  const [showUnsavedRunDialog, setShowUnsavedRunDialog] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    },
    []
  );

  const handleSave = async () => {
    if (!currentWorkflowId) {
      return;
    }

    setIsSaving(true);
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const executeWorkflow = async (mode: "test" | "production" = runMode) => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before executing");
      return;
    }

    if (mode === "production") {
      if (!deploymentUrl) {
        toast.error("No deployment found. Deploy the workflow first.");
        return;
      }

      setIsExecuting(true);
      try {
        toast.info("Triggering production workflow...");
        const result = await triggerProductionWorkflow(
          workflowName,
          deploymentUrl
        );
        toast.success("Production workflow triggered successfully");
        console.log("Production workflow result:", result);
      } catch (error) {
        console.error("Failed to trigger production workflow:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to trigger production workflow"
        );
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    setIsExecuting(true);
    await executeTestWorkflow({
      workflowId: currentWorkflowId,
      nodes,
      updateNodeData,
      pollingIntervalRef,
      setIsExecuting,
    });
    // Don't set executing to false here - let polling handle it
  };

  const handleExecute = async (mode: "test" | "production" = runMode) => {
    await executeWorkflow(mode);
  };

  return {
    runMode,
    setRunMode,
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    handleSave,
    handleExecute,
  };
}

// Hook for workflow state management
function useWorkflowState() {
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const clearWorkflow = useSetAtom(clearWorkflowAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [workflowName, setCurrentWorkflowName] = useAtom(
    currentWorkflowNameAtom
  );
  const router = useRouter();
  const [showClearDialog, setShowClearDialog] = useAtom(showClearDialogAtom);
  const [showDeleteDialog, setShowDeleteDialog] = useAtom(showDeleteDialogAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useAtom(
    hasUnsavedChangesAtom
  );
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const { data: session } = useSession();

  const [isDeploying, setIsDeploying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, _setGeneratedCode] = useState<string>("");
  const [allWorkflows, setAllWorkflows] = useState<
    Array<{
      id: string;
      name: string;
      updatedAt: string;
    }>
  >([]);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState(workflowName);

  // Load deployment status on mount
  useEffect(() => {
    if (!currentWorkflowId) {
      return;
    }

    getDeploymentStatus(currentWorkflowId)
      .then((data) => setDeploymentUrl(data.deploymentUrl || null))
      .catch((error) =>
        console.error("Failed to load deployment status:", error)
      );
  }, [currentWorkflowId]);

  // Sync newWorkflowName when workflowName changes
  useEffect(() => {
    setNewWorkflowName(workflowName);
  }, [workflowName]);

  // Load all workflows on mount
  useEffect(() => {
    const loadAllWorkflows = async () => {
      try {
        const workflows = await workflowApi.getAll();
        setAllWorkflows(workflows);
      } catch (error) {
        console.error("Failed to load workflows:", error);
      }
    };
    loadAllWorkflows();
  }, []);

  return {
    nodes,
    edges,
    isExecuting,
    setIsExecuting,
    isGenerating,
    clearWorkflow,
    updateNodeData,
    currentWorkflowId,
    workflowName,
    setCurrentWorkflowName,
    router,
    showClearDialog,
    setShowClearDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    session,
    isDeploying,
    setIsDeploying,
    isDownloading,
    setIsDownloading,
    deploymentUrl,
    setDeploymentUrl,
    showCodeDialog,
    setShowCodeDialog,
    generatedCode,
    allWorkflows,
    setAllWorkflows,
    showRenameDialog,
    setShowRenameDialog,
    newWorkflowName,
    setNewWorkflowName,
  };
}

// Hook for workflow actions
function useWorkflowActions(state: ReturnType<typeof useWorkflowState>) {
  const {
    currentWorkflowId,
    workflowName,
    nodes,
    edges,
    updateNodeData,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    deploymentUrl,
    setShowClearDialog,
    clearWorkflow,
    setShowDeleteDialog,
    router,
    setCurrentWorkflowName,
    setAllWorkflows,
    newWorkflowName,
    setShowRenameDialog,
    setIsDeploying,
    setIsDownloading,
    setDeploymentUrl,
    generatedCode,
  } = state;

  const {
    runMode,
    setRunMode,
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    handleSave,
    handleExecute,
  } = useWorkflowHandlers({
    currentWorkflowId,
    workflowName,
    nodes,
    edges,
    updateNodeData,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    deploymentUrl,
  });

  const handleSaveAndRun = async () => {
    await handleSave();
    setShowUnsavedRunDialog(false);
    await handleExecute(runMode);
  };

  const handleRunWithoutSaving = async () => {
    setShowUnsavedRunDialog(false);
    await handleExecute(runMode);
  };

  const handleClearWorkflow = () => {
    clearWorkflow();
    setShowClearDialog(false);
  };

  const handleDeleteWorkflow = async () => {
    if (!currentWorkflowId) {
      return;
    }

    try {
      await workflowApi.delete(currentWorkflowId);
      setShowDeleteDialog(false);
      toast.success("Workflow deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow. Please try again.");
    }
  };

  const handleNewWorkflow = () => {
    clearWorkflow();
    router.push("/");
  };

  const handleRenameWorkflow = async () => {
    if (!(currentWorkflowId && newWorkflowName.trim())) {
      return;
    }

    try {
      await workflowApi.update(currentWorkflowId, {
        name: newWorkflowName,
      });
      setShowRenameDialog(false);
      setCurrentWorkflowName(newWorkflowName);
      toast.success("Workflow renamed successfully");
      const workflows = await workflowApi.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to rename workflow:", error);
      toast.error("Failed to rename workflow. Please try again.");
    }
  };

  const saveBeforeDeploy = async (): Promise<boolean> => {
    if (!currentWorkflowId) {
      return false;
    }

    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      return true;
    } catch {
      toast.error("Failed to save workflow before deployment");
      return false;
    }
  };

  const executeDeployment = async (workflowIdParam: string) => {
    const result = await deploy(workflowIdParam);

    if (!result.success) {
      throw new Error(result.error || "Deployment failed");
    }

    setDeploymentUrl(result.deploymentUrl || null);
    toast.success("Workflow deployed successfully!");

    if (result.deploymentUrl) {
      showDeploymentSuccessToast(result.deploymentUrl);
    }
  };

  const handleDeploy = async () => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before deploying");
      return;
    }

    setIsDeploying(true);
    toast.info("Preparing deployment...");

    try {
      const saved = await saveBeforeDeploy();
      if (!saved) {
        return;
      }

      toast.info("Starting deployment to Vercel...");
      await executeDeployment(currentWorkflowId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deploy workflow"
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDownload = async () => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before downloading");
      return;
    }

    setIsDownloading(true);
    toast.info("Preparing workflow files for download...");

    try {
      const result = await prepareWorkflowDownload(currentWorkflowId);

      if (!result.success) {
        throw new Error(result.error || "Failed to prepare download");
      }

      if (!result.files) {
        throw new Error("No files to download");
      }

      // Import JSZip dynamically
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add all files to the zip
      for (const [path, content] of Object.entries(result.files)) {
        zip.file(path, content);
      }

      // Generate the zip file
      const blob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-workflow.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Workflow downloaded successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download workflow"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const workflows = await workflowApi.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard");
  };

  return {
    runMode,
    setRunMode,
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    handleSave,
    handleExecute,
    handleSaveAndRun,
    handleRunWithoutSaving,
    handleClearWorkflow,
    handleDeleteWorkflow,
    handleNewWorkflow,
    handleRenameWorkflow,
    handleDeploy,
    handleDownload,
    loadWorkflows,
    handleCopyCode,
  };
}

// Toolbar Actions Component - handles undo/redo, save/deploy, and run buttons
function ToolbarActions({
  workflowId,
  state,
  actions,
}: {
  workflowId?: string;
  state: ReturnType<typeof useWorkflowState>;
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  if (!workflowId) {
    return null;
  }

  return (
    <>
      {/* Undo/Redo - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canUndo || state.isGenerating}
          onClick={() => state.undo()}
          size="icon"
          title="Undo"
          variant="secondary"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canRedo || state.isGenerating}
          onClick={() => state.redo()}
          size="icon"
          title="Redo"
          variant="secondary"
        >
          <Redo2 className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Undo/Redo - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canUndo || state.isGenerating}
          onClick={() => state.undo()}
          size="icon"
          title="Undo"
          variant="secondary"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={!state.canRedo || state.isGenerating}
          onClick={() => state.redo()}
          size="icon"
          title="Redo"
          variant="secondary"
        >
          <Redo2 className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Save/Deploy - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton handleDownload={actions.handleDownload} state={state} />
        <DeployButton handleDeploy={actions.handleDeploy} state={state} />
        {state.deploymentUrl && (
          <Button
            className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
            onClick={() =>
              state.deploymentUrl && window.open(state.deploymentUrl, "_blank")
            }
            size="icon"
            title="Open deployment"
            variant="secondary"
          >
            <ExternalLink className="size-4" />
          </Button>
        )}
      </ButtonGroup>

      {/* Save/Deploy - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton handleDownload={actions.handleDownload} state={state} />
        <DeployButton handleDeploy={actions.handleDeploy} state={state} />
        {state.deploymentUrl && (
          <Button
            className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
            onClick={() =>
              state.deploymentUrl && window.open(state.deploymentUrl, "_blank")
            }
            size="icon"
            title="Open deployment"
            variant="secondary"
          >
            <ExternalLink className="size-4" />
          </Button>
        )}
      </ButtonGroup>

      <RunButtonGroup actions={actions} state={state} />
    </>
  );
}

// Save Button Component
function SaveButton({
  state,
  handleSave,
}: {
  state: ReturnType<typeof useWorkflowState>;
  handleSave: () => Promise<void>;
}) {
  return (
    <Button
      className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        !state.currentWorkflowId || state.isGenerating || state.isSaving
      }
      onClick={handleSave}
      size="icon"
      title={state.isSaving ? "Saving..." : "Save workflow"}
      variant="secondary"
    >
      {state.isSaving ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      {state.hasUnsavedChanges && !state.isSaving && (
        <div className="-top-0.5 -right-0.5 absolute size-2 rounded-full bg-primary" />
      )}
    </Button>
  );
}

// Deploy Button Component
function DeployButton({
  state,
  handleDeploy,
}: {
  state: ReturnType<typeof useWorkflowState>;
  handleDeploy: () => Promise<void>;
}) {
  return (
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        state.isDeploying ||
        state.nodes.length === 0 ||
        state.isGenerating ||
        !state.currentWorkflowId
      }
      onClick={handleDeploy}
      size="icon"
      title={
        state.isDeploying
          ? "Deploying to production..."
          : "Deploy to production"
      }
      variant="secondary"
    >
      {state.isDeploying ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Rocket className="size-4" />
      )}
    </Button>
  );
}

// Download Button Component
function DownloadButton({
  state,
  handleDownload,
}: {
  state: ReturnType<typeof useWorkflowState>;
  handleDownload: () => Promise<void>;
}) {
  return (
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        state.isDownloading ||
        state.nodes.length === 0 ||
        state.isGenerating ||
        !state.currentWorkflowId
      }
      onClick={handleDownload}
      size="icon"
      title={
        state.isDownloading
          ? "Preparing download..."
          : "Download workflow files"
      }
      variant="secondary"
    >
      {state.isDownloading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
    </Button>
  );
}

// Run Button Group Component
function RunButtonGroup({
  state,
  actions,
}: {
  state: ReturnType<typeof useWorkflowState>;
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  return (
    <ButtonGroup>
      <Button
        className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        disabled={
          state.isExecuting || state.nodes.length === 0 || state.isGenerating
        }
        onClick={() => actions.handleExecute()}
        size="icon"
        variant="secondary"
      >
        {state.isExecuting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {actions.runMode === "test" && !state.isExecuting && (
          <div className="absolute right-0.5 bottom-0.5">
            <FlaskConical
              className="text-muted-foreground"
              strokeWidth={2.5}
              style={{ width: "12px", height: "12px" }}
            />
          </div>
        )}
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-6 border px-1 hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
            disabled={
              state.isExecuting ||
              state.nodes.length === 0 ||
              state.isGenerating
            }
            size="icon"
            title="Select run mode"
            variant="secondary"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={5}>
          <DropdownMenuItem onClick={() => actions.setRunMode("test")}>
            <Play className="size-4" />
            <span>Test Run (Local)</span>
            {actions.runMode === "test" && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!state.deploymentUrl}
            onClick={() => actions.setRunMode("production")}
          >
            <Play className="size-4" />
            <span>Production Run</span>
            {actions.runMode === "production" && (
              <Check className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}

// Workflow Menu Component
function WorkflowMenuComponent({
  workflowId,
  state,
  actions,
}: {
  workflowId?: string;
  state: ReturnType<typeof useWorkflowState>;
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  return (
    <div className="flex h-9 items-center overflow-hidden rounded-md border bg-secondary text-secondary-foreground">
      <DropdownMenu onOpenChange={(open) => open && actions.loadWorkflows()}>
        <DropdownMenuTrigger className="flex h-full cursor-pointer items-center gap-2 px-3 font-medium text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5">
          <WorkflowIcon className="size-4" />
          <p className="font-medium text-sm">
            {workflowId ? state.workflowName : "New Workflow"}
          </p>
          <ChevronDown className="size-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            className="flex items-center justify-between"
            onClick={actions.handleNewWorkflow}
          >
            <span>New Workflow</span>
            {!workflowId && <Check className="size-4 shrink-0" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {state.allWorkflows.length === 0 ? (
            <DropdownMenuItem disabled>No workflows found</DropdownMenuItem>
          ) : (
            state.allWorkflows
              .filter((w) => w.name !== "__current__")
              .map((workflow) => (
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  key={workflow.id}
                  onClick={() => state.router.push(`/workflows/${workflow.id}`)}
                >
                  <span className="truncate">{workflow.name}</span>
                  {workflow.id === state.currentWorkflowId && (
                    <Check className="size-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Workflow Dialogs Component
function WorkflowDialogsComponent({
  state,
  actions,
}: {
  state: ReturnType<typeof useWorkflowState>;
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  return (
    <>
      <Dialog
        onOpenChange={state.setShowClearDialog}
        open={state.showClearDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all nodes and connections? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => state.setShowClearDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={actions.handleClearWorkflow} variant="destructive">
              Clear Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={state.setShowRenameDialog}
        open={state.showRenameDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
            <DialogDescription>
              Enter a new name for your workflow.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.handleRenameWorkflow();
            }}
          >
            <div className="space-y-2 py-4">
              <Label className="ml-1" htmlFor="workflow-name">
                Workflow Name
              </Label>
              <Input
                id="workflow-name"
                onChange={(e) => state.setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                value={state.newWorkflowName}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => state.setShowRenameDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!state.newWorkflowName.trim()} type="submit">
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={state.setShowDeleteDialog}
        open={state.showDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{state.workflowName}
              &rdquo;? This will permanently delete the workflow. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => state.setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={actions.handleDeleteWorkflow}
              variant="destructive"
            >
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={state.setShowCodeDialog}
        open={state.showCodeDialog}
      >
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Generated Workflow Code</DialogTitle>
            <DialogDescription>
              This is the generated code for your workflow using the Vercel
              Workflow SDK. Copy this code and deploy it to a Next.js project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
              <code>{state.generatedCode}</code>
            </pre>
          </div>
          <DialogFooter>
            <Button
              onClick={() => state.setShowCodeDialog(false)}
              variant="outline"
            >
              Close
            </Button>
            <Button onClick={actions.handleCopyCode}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={actions.setShowUnsavedRunDialog}
        open={actions.showUnsavedRunDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save before running
              the workflow?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={actions.handleRunWithoutSaving} variant="outline">
              Run Without Saving
            </Button>
            <Button onClick={actions.handleSaveAndRun}>Save and Run</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const WorkflowToolbar = ({ workflowId }: WorkflowToolbarProps) => {
  const state = useWorkflowState();
  const actions = useWorkflowActions(state);

  return (
    <>
      <Panel
        className="flex flex-col gap-2 rounded-none border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-left"
      >
        <WorkflowMenuComponent
          actions={actions}
          state={state}
          workflowId={workflowId}
        />
      </Panel>

      <Panel
        className="flex flex-col-reverse items-end gap-2 border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-right"
      >
        <ToolbarActions
          actions={actions}
          state={state}
          workflowId={workflowId}
        />
        <GitHubStarsButton />
        <Button asChild className="h-8 px-3" size="sm" variant="secondary">
          <a
            className="flex items-center gap-1.5"
            href={VERCEL_DEPLOY_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-label="Vercel Logo"
              className="h-3 w-3"
              fill="currentColor"
              role="img"
              viewBox="0 0 76 65"
            >
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
            <span>Deploy Your Own</span>
          </a>
        </Button>
        <UserMenu />
      </Panel>

      <WorkflowDialogsComponent actions={actions} state={state} />
    </>
  );
};
