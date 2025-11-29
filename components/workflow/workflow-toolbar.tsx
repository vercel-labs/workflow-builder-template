"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Plus,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api, type IntegrationType } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { integrationsAtom } from "@/lib/integrations-store";
import {
  addNodeAtom,
  canRedoAtom,
  canUndoAtom,
  clearWorkflowAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  deleteEdgeAtom,
  deleteNodeAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  redoAtom,
  selectedEdgeAtom,
  selectedExecutionIdAtom,
  selectedNodeAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  triggerExecuteAtom,
  undoAtom,
  updateNodeDataAtom,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflow-store";
import { findActionById, getIntegrationLabels } from "@/plugins";
import { Panel } from "../ai-elements/panel";
import { DeployButton } from "../deploy-button";
import { GitHubStarsButton } from "../github-stars-button";
import { IntegrationsDialog } from "../settings/integrations-dialog";
import { IntegrationIcon } from "../ui/integration-icon";
import { WorkflowIcon } from "../ui/workflow-icon";
import { UserMenu } from "../workflows/user-menu";
import { NodeConfigPanel } from "./node-config-panel";

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

type MissingIntegrationInfo = {
  integrationType: IntegrationType;
  integrationLabel: string;
  nodeNames: string[];
};

// Built-in actions that require integrations but aren't in the plugin registry
const BUILTIN_ACTION_INTEGRATIONS: Record<string, IntegrationType> = {
  "Database Query": "database",
};

// Labels for built-in integration types that don't have plugins
const BUILTIN_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

// Get missing integrations for workflow nodes
// Uses the plugin registry to determine which integrations are required
// Also handles built-in actions that aren't in the plugin registry
function getMissingIntegrations(
  nodes: WorkflowNode[],
  userIntegrations: Array<{ type: IntegrationType }>
): MissingIntegrationInfo[] {
  const userIntegrationTypes = new Set(userIntegrations.map((i) => i.type));
  const missingByType = new Map<IntegrationType, string[]>();
  const integrationLabels = getIntegrationLabels();

  for (const node of nodes) {
    // Skip disabled nodes
    if (node.data.enabled === false) {
      continue;
    }

    const actionType = node.data.config?.actionType as string | undefined;
    if (!actionType) {
      continue;
    }

    // Look up the integration type from the plugin registry first
    const action = findActionById(actionType);
    // Fall back to built-in action integrations for actions not in the registry
    const requiredIntegrationType =
      action?.integration || BUILTIN_ACTION_INTEGRATIONS[actionType];

    if (!requiredIntegrationType) {
      continue;
    }

    // Check if this node has an integrationId configured
    const hasIntegrationConfigured = Boolean(node.data.config?.integrationId);
    if (hasIntegrationConfigured) {
      continue;
    }

    // Check if user has any integration of this type
    if (!userIntegrationTypes.has(requiredIntegrationType)) {
      const existing = missingByType.get(requiredIntegrationType) || [];
      existing.push(node.data.label || actionType);
      missingByType.set(requiredIntegrationType, existing);
    }
  }

  return Array.from(missingByType.entries()).map(
    ([integrationType, nodeNames]) => ({
      integrationType,
      integrationLabel:
        integrationLabels[integrationType] ||
        BUILTIN_INTEGRATION_LABELS[integrationType] ||
        integrationType,
      nodeNames,
    })
  );
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
  setSelectedExecutionId: (value: string | null) => void;
};

async function executeTestWorkflow({
  workflowId,
  nodes,
  updateNodeData,
  pollingIntervalRef,
  setIsExecuting,
  setSelectedExecutionId,
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

    // Select the new execution
    setSelectedExecutionId(result.executionId);

    // Poll for execution status updates
    const pollInterval = setInterval(async () => {
      try {
        const statusData = await api.workflow.getExecutionStatus(
          result.executionId
        );

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

          setIsExecuting(false);

          // Don't reset node statuses - let them show the final state
          // The user can click another run or deselect to reset
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

// Hook for workflow handlers
type WorkflowHandlerParams = {
  currentWorkflowId: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  isExecuting: boolean;
  setIsExecuting: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setActiveTab: (value: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedExecutionId: (id: string | null) => void;
  userIntegrations: Array<{ type: IntegrationType }>;
};

function useWorkflowHandlers({
  currentWorkflowId,
  nodes,
  edges,
  updateNodeData,
  isExecuting,
  setIsExecuting,
  setIsSaving,
  setHasUnsavedChanges,
  setActiveTab,
  setNodes,
  setEdges,
  setSelectedNodeId,
  setSelectedExecutionId,
  userIntegrations,
}: WorkflowHandlerParams) {
  const [showUnsavedRunDialog, setShowUnsavedRunDialog] = useState(false);
  const [showMissingIntegrationsDialog, setShowMissingIntegrationsDialog] =
    useState(false);
  const [missingIntegrations, setMissingIntegrations] = useState<
    MissingIntegrationInfo[]
  >([]);
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
      await api.workflow.update(currentWorkflowId, { nodes, edges });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const executeWorkflow = async () => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before executing");
      return;
    }

    // Switch to Runs tab when starting a test run
    setActiveTab("runs");

    // Deselect all nodes and edges
    setNodes(nodes.map((node) => ({ ...node, selected: false })));
    setEdges(edges.map((edge) => ({ ...edge, selected: false })));
    setSelectedNodeId(null);

    setIsExecuting(true);
    await executeTestWorkflow({
      workflowId: currentWorkflowId,
      nodes,
      updateNodeData,
      pollingIntervalRef,
      setIsExecuting,
      setSelectedExecutionId,
    });
    // Don't set executing to false here - let polling handle it
  };

  const handleExecute = async () => {
    // Guard against concurrent executions
    if (isExecuting) {
      return;
    }

    // Check for missing integrations before executing
    const missing = getMissingIntegrations(nodes, userIntegrations);
    if (missing.length > 0) {
      setMissingIntegrations(missing);
      setShowMissingIntegrationsDialog(true);
      return;
    }
    await executeWorkflow();
  };

  const handleExecuteAnyway = async () => {
    // Guard against concurrent executions
    if (isExecuting) {
      return;
    }

    setShowMissingIntegrationsDialog(false);
    await executeWorkflow();
  };

  return {
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    showMissingIntegrationsDialog,
    setShowMissingIntegrationsDialog,
    missingIntegrations,
    handleSave,
    handleExecute,
    handleExecuteAnyway,
  };
}

// Hook for workflow state management
function useWorkflowState() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
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
  const addNode = useSetAtom(addNodeAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const { data: session } = useSession();
  const setActiveTab = useSetAtom(propertiesPanelActiveTabAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const setSelectedExecutionId = useSetAtom(selectedExecutionIdAtom);
  const userIntegrations = useAtomValue(integrationsAtom);
  const [triggerExecute, setTriggerExecute] = useAtom(triggerExecuteAtom);

  const [isDownloading, setIsDownloading] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
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

  // Sync newWorkflowName when workflowName changes
  useEffect(() => {
    setNewWorkflowName(workflowName);
  }, [workflowName]);

  // Load all workflows on mount
  useEffect(() => {
    const loadAllWorkflows = async () => {
      try {
        const workflows = await api.workflow.getAll();
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
    addNode,
    canUndo,
    canRedo,
    session,
    isDownloading,
    setIsDownloading,
    showCodeDialog,
    setShowCodeDialog,
    showExportDialog,
    setShowExportDialog,
    generatedCode,
    allWorkflows,
    setAllWorkflows,
    showRenameDialog,
    setShowRenameDialog,
    newWorkflowName,
    setNewWorkflowName,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
    triggerExecute,
    setTriggerExecute,
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
    isExecuting,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    setShowClearDialog,
    clearWorkflow,
    setShowDeleteDialog,
    setCurrentWorkflowName,
    setAllWorkflows,
    newWorkflowName,
    setShowRenameDialog,
    setIsDownloading,
    generatedCode,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
    triggerExecute,
    setTriggerExecute,
  } = state;

  const {
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    showMissingIntegrationsDialog,
    setShowMissingIntegrationsDialog,
    missingIntegrations,
    handleSave,
    handleExecute,
    handleExecuteAnyway,
  } = useWorkflowHandlers({
    currentWorkflowId,
    nodes,
    edges,
    updateNodeData,
    isExecuting,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
  });

  // Listen for execute trigger from keyboard shortcut
  useEffect(() => {
    if (triggerExecute) {
      setTriggerExecute(false);
      handleExecute();
    }
  }, [triggerExecute, setTriggerExecute, handleExecute]);

  const handleSaveAndRun = async () => {
    await handleSave();
    setShowUnsavedRunDialog(false);
    await handleExecute();
  };

  const handleRunWithoutSaving = async () => {
    setShowUnsavedRunDialog(false);
    await handleExecute();
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
      await api.workflow.delete(currentWorkflowId);
      setShowDeleteDialog(false);
      toast.success("Workflow deleted successfully");
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow. Please try again.");
    }
  };

  const handleRenameWorkflow = async () => {
    if (!(currentWorkflowId && newWorkflowName.trim())) {
      return;
    }

    try {
      await api.workflow.update(currentWorkflowId, {
        name: newWorkflowName,
      });
      setShowRenameDialog(false);
      setCurrentWorkflowName(newWorkflowName);
      toast.success("Workflow renamed successfully");
      const workflows = await api.workflow.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to rename workflow:", error);
      toast.error("Failed to rename workflow. Please try again.");
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
      const result = await api.workflow.download(currentWorkflowId);

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
      const workflows = await api.workflow.getAll();
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
    showUnsavedRunDialog,
    setShowUnsavedRunDialog,
    showMissingIntegrationsDialog,
    setShowMissingIntegrationsDialog,
    missingIntegrations,
    handleSave,
    handleExecute,
    handleExecuteAnyway,
    handleSaveAndRun,
    handleRunWithoutSaving,
    handleClearWorkflow,
    handleDeleteWorkflow,
    handleRenameWorkflow,
    handleDownload,
    loadWorkflows,
    handleCopyCode,
  };
}

// Toolbar Actions Component - handles add step, undo/redo, save, and run buttons
function ToolbarActions({
  workflowId,
  state,
  actions,
}: {
  workflowId?: string;
  state: ReturnType<typeof useWorkflowState>;
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  const [showPropertiesSheet, setShowPropertiesSheet] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [selectedEdgeId] = useAtom(selectedEdgeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const { screenToFlowPosition } = useReactFlow();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const hasSelection = selectedNode || selectedEdge;

  if (!workflowId) {
    return null;
  }

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    } else if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
    }
    setShowDeleteAlert(false);
  };

  const handleAddStep = () => {
    // Get the ReactFlow wrapper (the visible canvas container)
    const flowWrapper = document.querySelector(".react-flow");
    if (!flowWrapper) {
      return;
    }

    const rect = flowWrapper.getBoundingClientRect();
    // Calculate center in absolute screen coordinates
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Convert to flow coordinates
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    // Adjust for node dimensions to center it properly
    // Action node is 192px wide and 192px tall (w-48 h-48 in Tailwind)
    const nodeWidth = 192;
    const nodeHeight = 192;
    position.x -= nodeWidth / 2;
    position.y -= nodeHeight / 2;

    // Check if there's already a node at this position
    const offset = 20; // Offset distance in pixels
    const threshold = 20; // How close nodes need to be to be considered overlapping

    const finalPosition = { ...position };
    let hasOverlap = true;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop

    while (hasOverlap && attempts < maxAttempts) {
      hasOverlap = state.nodes.some((node) => {
        const dx = Math.abs(node.position.x - finalPosition.x);
        const dy = Math.abs(node.position.y - finalPosition.y);
        return dx < threshold && dy < threshold;
      });

      if (hasOverlap) {
        // Offset diagonally down-right
        finalPosition.x += offset;
        finalPosition.y += offset;
        attempts += 1;
      }
    }

    // Create new action node
    const newNode: WorkflowNode = {
      id: nanoid(),
      type: "action",
      position: finalPosition,
      data: {
        label: "",
        description: "",
        type: "action",
        config: {},
        status: "idle",
      },
    };

    state.addNode(newNode);
    state.setSelectedNodeId(newNode.id);
    state.setActiveTab("properties");
  };

  return (
    <>
      {/* Add Step - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={state.isGenerating}
          onClick={handleAddStep}
          size="icon"
          title="Add Step"
          variant="secondary"
        >
          <Plus className="size-4" />
        </Button>
      </ButtonGroup>

      {/* Properties - Mobile Vertical (always visible) */}
      <ButtonGroup className="flex md:hidden" orientation="vertical">
        <Button
          className="border hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => setShowPropertiesSheet(true)}
          size="icon"
          title="Properties"
          variant="secondary"
        >
          <Settings2 className="size-4" />
        </Button>
        {/* Delete - Show when node or edge is selected */}
        {hasSelection && (
          <Button
            className="border hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => setShowDeleteAlert(true)}
            size="icon"
            title="Delete"
            variant="secondary"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </ButtonGroup>

      {/* Properties Sheet - Mobile Only */}
      <Sheet onOpenChange={setShowPropertiesSheet} open={showPropertiesSheet}>
        <SheetContent className="w-full p-0 sm:max-w-full" side="bottom">
          <SheetTitle className="sr-only" />
          <div className="h-[80vh]">
            <NodeConfigPanel />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Alert - Mobile Only */}
      <AlertDialog onOpenChange={setShowDeleteAlert} open={showDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedNode ? "Node" : "Connection"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {selectedNode ? "node" : "connection"}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Step - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={state.isGenerating}
          onClick={handleAddStep}
          size="icon"
          title="Add Step"
          variant="secondary"
        >
          <Plus className="size-4" />
        </Button>
      </ButtonGroup>

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

      {/* Save/Download - Mobile Vertical */}
      <ButtonGroup className="flex lg:hidden" orientation="vertical">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton state={state} />
      </ButtonGroup>

      {/* Save/Download - Desktop Horizontal */}
      <ButtonGroup className="hidden lg:flex" orientation="horizontal">
        <SaveButton handleSave={actions.handleSave} state={state} />
        <DownloadButton state={state} />
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
        <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
      )}
    </Button>
  );
}

// Download Button Component
function DownloadButton({
  state,
}: {
  state: ReturnType<typeof useWorkflowState>;
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
      onClick={() => state.setShowExportDialog(true)}
      size="icon"
      title={
        state.isDownloading
          ? "Preparing download..."
          : "Export workflow as code"
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
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        state.isExecuting || state.nodes.length === 0 || state.isGenerating
      }
      onClick={() => actions.handleExecute()}
      size="icon"
      title="Run Workflow"
      variant="secondary"
    >
      {state.isExecuting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Play className="size-4" />
      )}
    </Button>
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
            {workflowId ? (
              state.workflowName
            ) : (
              <>
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New Workflow</span>
              </>
            )}
          </p>
          <ChevronDown className="size-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            asChild
            className="flex items-center justify-between"
          >
            <a href="/">
              New Workflow{" "}
              {!workflowId && <Check className="size-4 shrink-0" />}
            </a>
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

// Missing Integrations Dialog Component
function MissingIntegrationsDialog({
  actions,
}: {
  actions: ReturnType<typeof useWorkflowActions>;
}) {
  const [showIntegrationsDialog, setShowIntegrationsDialog] = useState(false);

  const handleAddIntegrations = () => {
    actions.setShowMissingIntegrationsDialog(false);
    setShowIntegrationsDialog(true);
  };

  return (
    <>
      <AlertDialog
        onOpenChange={actions.setShowMissingIntegrationsDialog}
        open={actions.showMissingIntegrationsDialog}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-orange-500" />
              Missing Integrations
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This workflow has steps that require integrations which are
                  not configured. The workflow will likely fail without them.
                </p>
                <div className="space-y-2">
                  {actions.missingIntegrations.map((missing) => (
                    <div
                      className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3"
                      key={missing.integrationType}
                    >
                      <IntegrationIcon
                        className="mt-0.5 size-5 shrink-0"
                        integration={missing.integrationType}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {missing.integrationLabel}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Used by:{" "}
                          {missing.nodeNames.length > 3
                            ? `${missing.nodeNames.slice(0, 3).join(", ")} and ${missing.nodeNames.length - 3} more`
                            : missing.nodeNames.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={actions.handleExecuteAnyway} variant="outline">
              Run Anyway
            </Button>
            <Button onClick={handleAddIntegrations}>Add Integrations</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IntegrationsDialog
        onOpenChange={setShowIntegrationsDialog}
        open={showIntegrationsDialog}
      />
    </>
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
              Workflow SDK. Copy this code or download the ZIP to run it in your
              own Next.js project.
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

      <Dialog
        onOpenChange={state.setShowExportDialog}
        open={state.showExportDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5" />
              Export Workflow as Code
            </DialogTitle>
            <DialogDescription>
              Export your workflow as a standalone Next.js project that you can
              run independently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm">
              This will generate a complete Next.js project containing your
              workflow code. Once exported, you can run your workflow outside of
              the Workflow Builder, deploy it to Vercel, or integrate it into
              your existing applications.
            </p>
            <Alert>
              <FlaskConical className="size-4" />
              <AlertTitle>Experimental Feature</AlertTitle>
              <AlertDescription className="block">
                This feature is experimental and may have limitations. If you
                encounter any issues, please{" "}
                <a
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  href="https://github.com/vercel-labs/workflow-builder-template/issues"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  report them on GitHub
                </a>
                .
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              onClick={() => state.setShowExportDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={state.isDownloading}
              onClick={() => {
                state.setShowExportDialog(false);
                actions.handleDownload();
              }}
            >
              {state.isDownloading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  Export Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MissingIntegrationsDialog actions={actions} />
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

      <div className="pointer-events-auto absolute top-4 right-4 z-10">
        <div className="flex flex-col-reverse items-end gap-2 lg:flex-row lg:items-center">
          <ToolbarActions
            actions={actions}
            state={state}
            workflowId={workflowId}
          />
          <div className="flex items-center gap-2">
            {!workflowId && (
              <>
                <GitHubStarsButton />
                <DeployButton />
              </>
            )}
            <UserMenu />
          </div>
        </div>
      </div>

      <WorkflowDialogsComponent actions={actions} state={state} />
    </>
  );
};
