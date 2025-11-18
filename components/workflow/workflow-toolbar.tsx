"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  Play,
  Redo2,
  Rocket,
  Save,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deploy } from "@/app/actions/workflow/deploy";
import { execute } from "@/app/actions/workflow/execute";
import { getDeploymentStatus } from "@/app/actions/workflow/get-deployment-status";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
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
  type WorkflowNode,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { WorkflowIcon } from "../ui/workflow-icon";
import { UserMenu } from "../workflows/user-menu";
import { NodeToolbar } from "./node-toolbar";

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

async function executeTestWorkflow(
  workflowId: string,
  nodes: WorkflowNode[],
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void
) {
  // Set all nodes to idle first
  updateNodesStatus(nodes, updateNodeData, "idle");

  try {
    const result = await execute(workflowId, {});

    if (result.status === "error") {
      toast.error(result.error || "Workflow execution failed");
    } else {
      toast.success("Test run completed successfully");
    }

    // Update all nodes based on result
    const finalStatus: "idle" | "running" | "success" | "error" =
      result.status === "error" ? "error" : "success";
    updateNodesStatus(nodes, updateNodeData, finalStatus);
  } catch (error) {
    console.error("Failed to execute workflow:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to execute workflow"
    );
    updateNodesStatus(nodes, updateNodeData, "error");
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

export const WorkflowToolbar = ({ workflowId }: WorkflowToolbarProps) => {
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
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, _setGeneratedCode] = useState<string>("");
  const [runMode, setRunMode] = useState<"test" | "production">("test");
  const [allWorkflows, setAllWorkflows] = useState<
    Array<{
      id: string;
      name: string;
      updatedAt: string;
    }>
  >([]);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState(workflowName);
  const [showUnsavedRunDialog, setShowUnsavedRunDialog] = useState(false);

  const handleExecute = async (mode: "test" | "production" = runMode) => {
    // Check for unsaved changes only on test runs
    if (mode === "test" && hasUnsavedChanges) {
      setShowUnsavedRunDialog(true);
      return;
    }

    await executeWorkflow(mode);
  };

  const handleSaveAndRun = async () => {
    await handleSave();
    setShowUnsavedRunDialog(false);
    await executeWorkflow(runMode);
  };

  const handleRunWithoutSaving = async () => {
    setShowUnsavedRunDialog(false);
    await executeWorkflow(runMode);
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

    // Test run = execute locally
    setIsExecuting(true);
    await executeTestWorkflow(currentWorkflowId, nodes, updateNodeData);
    setIsExecuting(false);
  };

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
      // Update the current workflow name
      setCurrentWorkflowName(newWorkflowName);
      toast.success("Workflow renamed successfully");
      // Reload workflows to update the list
      const workflows = await workflowApi.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to rename workflow:", error);
      toast.error("Failed to rename workflow. Please try again.");
    }
  };

  const handleDeploy = async () => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before deploying");
      return;
    }

    // Save workflow first
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
    } catch {
      toast.error("Failed to save workflow before deployment");
      return;
    }

    setIsDeploying(true);
    toast.info("Starting deployment to Vercel...");

    try {
      const result = await deploy(currentWorkflowId);

      if (!result.success) {
        throw new Error(result.error || "Deployment failed");
      }

      setDeploymentUrl(result.deploymentUrl || null);
      toast.success("Workflow deployed successfully!");

      if (result.deploymentUrl) {
        showDeploymentSuccessToast(result.deploymentUrl);
      }
    } catch (error) {
      console.error("Failed to deploy workflow:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deploy workflow"
      );
    } finally {
      setIsDeploying(false);
    }
  };

  // Load deployment status on mount
  useEffect(() => {
    if (currentWorkflowId) {
      getDeploymentStatus(currentWorkflowId)
        .then((data) => {
          setDeploymentUrl(data.deploymentUrl || null);
        })
        .catch((error) => {
          console.error("Failed to load deployment status:", error);
        });
    }
  }, [currentWorkflowId]);

  // Load workflows
  const loadWorkflows = async () => {
    try {
      const workflows = await workflowApi.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    }
  };

  // Sync newWorkflowName when workflowName changes
  useEffect(() => {
    setNewWorkflowName(workflowName);
  }, [workflowName]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard");
  };

  return (
    <>
      <Panel
        className="flex flex-col gap-2 rounded-none border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-left"
      >
        {session && (
          <div className="flex h-9 items-center overflow-hidden rounded-md border bg-secondary text-secondary-foreground">
            <DropdownMenu onOpenChange={(open) => open && loadWorkflows()}>
              <DropdownMenuTrigger className="flex h-full cursor-pointer items-center gap-2 px-3 font-medium text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5">
                <WorkflowIcon className="size-4" />
                <p className="font-medium text-sm">
                  {workflowId ? workflowName : "New Workflow"}
                </p>
                <ChevronDown className="size-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={handleNewWorkflow}
                >
                  <span>New Workflow</span>
                  {!workflowId && <Check className="size-4 shrink-0" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                  Recent Workflows
                </DropdownMenuLabel>
                {allWorkflows.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No workflows found
                  </DropdownMenuItem>
                ) : (
                  allWorkflows
                    .filter((w) => w.name !== "__current__")
                    .map((workflow) => (
                      <DropdownMenuItem
                        className="flex items-center justify-between"
                        key={workflow.id}
                        onClick={() => router.push(`/workflows/${workflow.id}`)}
                      >
                        <span className="truncate">{workflow.name}</span>
                        {workflow.id === currentWorkflowId && (
                          <Check className="size-4 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-full w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-full cursor-pointer items-center px-2 font-medium text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  disabled={!currentWorkflowId}
                  onClick={() => setShowRenameDialog(true)}
                >
                  <span>Rename</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={nodes.length === 0}
                  onClick={() => setShowClearDialog(true)}
                >
                  <span>Clear</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!currentWorkflowId}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <NodeToolbar />
      </Panel>

      <Panel
        className="flex flex-col-reverse items-end gap-2 border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-right"
      >
        {workflowId && (
          <>
            {/* Undo/Redo - Mobile Vertical */}
            <ButtonGroup className="flex lg:hidden" orientation="vertical">
              <Button
                className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={!canUndo || isGenerating}
                onClick={() => undo()}
                size="icon"
                title="Undo"
                variant="secondary"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={!canRedo || isGenerating}
                onClick={() => redo()}
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
                disabled={!canUndo || isGenerating}
                onClick={() => undo()}
                size="icon"
                title="Undo"
                variant="secondary"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={!canRedo || isGenerating}
                onClick={() => redo()}
                size="icon"
                title="Redo"
                variant="secondary"
              >
                <Redo2 className="size-4" />
              </Button>
            </ButtonGroup>

            {/* Save/Deploy - Mobile Vertical */}
            <ButtonGroup className="flex lg:hidden" orientation="vertical">
              <Button
                className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={!currentWorkflowId || isGenerating || isSaving}
                onClick={handleSave}
                size="icon"
                title={isSaving ? "Saving..." : "Save workflow"}
                variant="secondary"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {hasUnsavedChanges && !isSaving && (
                  <div className="-top-0.5 -right-0.5 absolute size-2 rounded-full bg-primary" />
                )}
              </Button>
              <Button
                className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={
                  isDeploying ||
                  nodes.length === 0 ||
                  isGenerating ||
                  !currentWorkflowId
                }
                onClick={handleDeploy}
                size="icon"
                title={
                  isDeploying
                    ? "Deploying to production..."
                    : "Deploy to production"
                }
                variant="secondary"
              >
                {isDeploying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Rocket className="size-4" />
                )}
              </Button>
              {deploymentUrl && (
                <Button
                  className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                  onClick={() => window.open(deploymentUrl, "_blank")}
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
              <Button
                className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={!currentWorkflowId || isGenerating || isSaving}
                onClick={handleSave}
                size="icon"
                title={isSaving ? "Saving..." : "Save workflow"}
                variant="secondary"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {hasUnsavedChanges && !isSaving && (
                  <div className="-top-0.5 -right-0.5 absolute size-2 rounded-full bg-primary" />
                )}
              </Button>
              <Button
                className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={
                  isDeploying ||
                  nodes.length === 0 ||
                  isGenerating ||
                  !currentWorkflowId
                }
                onClick={handleDeploy}
                size="icon"
                title={
                  isDeploying
                    ? "Deploying to production..."
                    : "Deploy to production"
                }
                variant="secondary"
              >
                {isDeploying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Rocket className="size-4" />
                )}
              </Button>
              {deploymentUrl && (
                <Button
                  className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                  onClick={() => window.open(deploymentUrl, "_blank")}
                  size="icon"
                  title="Open deployment"
                  variant="secondary"
                >
                  <ExternalLink className="size-4" />
                </Button>
              )}
            </ButtonGroup>

            <ButtonGroup>
              <Button
                className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
                disabled={isExecuting || nodes.length === 0 || isGenerating}
                onClick={() => handleExecute()}
                size="icon"
                variant="secondary"
              >
                {isExecuting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {runMode === "test" && !isExecuting && (
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
                    disabled={isExecuting || nodes.length === 0 || isGenerating}
                    size="icon"
                    title="Select run mode"
                    variant="secondary"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={5}>
                  <DropdownMenuItem onClick={() => setRunMode("test")}>
                    <Play className="size-4" />
                    <span>Test Run (Local)</span>
                    {runMode === "test" && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!deploymentUrl}
                    onClick={() => setRunMode("production")}
                  >
                    <Play className="size-4" />
                    <span>Production Run</span>
                    {runMode === "production" && (
                      <Check className="ml-auto size-4" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          </>
        )}

        <UserMenu />
      </Panel>

      {/* Clear Workflow Dialog */}
      <Dialog onOpenChange={setShowClearDialog} open={showClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all nodes and connections? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowClearDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleClearWorkflow} variant="destructive">
              Clear Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Workflow Dialog */}
      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
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
              handleRenameWorkflow();
            }}
          >
            <div className="py-4">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                className="mt-2"
                id="workflow-name"
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
                value={newWorkflowName}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowRenameDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!newWorkflowName.trim()} type="submit">
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workflow Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{workflowName}&rdquo;? This
              will permanently delete the workflow and its associated project.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDeleteWorkflow} variant="destructive">
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Generated Code Dialog */}
      <Dialog onOpenChange={setShowCodeDialog} open={showCodeDialog}>
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
              <code>{generatedCode}</code>
            </pre>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCodeDialog(false)} variant="outline">
              Close
            </Button>
            <Button onClick={handleCopyCode}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Run Confirmation Dialog */}
      <AlertDialog
        onOpenChange={setShowUnsavedRunDialog}
        open={showUnsavedRunDialog}
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
            <Button onClick={handleRunWithoutSaving} variant="outline">
              Run Without Saving
            </Button>
            <Button onClick={handleSaveAndRun}>Save and Run</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
