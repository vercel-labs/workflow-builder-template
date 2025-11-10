"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  Code,
  ExternalLink,
  FlaskConical,
  FolderOpen,
  Loader2,
  MoreVertical,
  Play,
  Redo2,
  Rocket,
  RotateCwIcon,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { create as createVercelProject } from "@/app/actions/vercel-project/create";
import { getAll as getAllVercelProjects } from "@/app/actions/vercel-project/get-all";
import { deploy } from "@/app/actions/workflow/deploy";
import { execute } from "@/app/actions/workflow/execute";
import { getCode } from "@/app/actions/workflow/get-code";
import { getDeploymentStatus } from "@/app/actions/workflow/get-deployment-status";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  creatingProjectAtom,
  newProjectNameAtom,
  showNewProjectDialogAtom,
  vercelProjectsAtom,
} from "@/lib/atoms/vercel-projects";
import { workflowApi } from "@/lib/workflow-api";
import {
  canRedoAtom,
  canUndoAtom,
  clearWorkflowAtom,
  currentVercelProjectNameAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  nodesAtom,
  redoAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  undoAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { UserMenu } from "../workflows/user-menu";
import { NodeToolbar } from "./node-toolbar";

type WorkflowToolbarProps = {
  workflowId?: string;
};

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
  const [vercelProjectName, setVercelProjectName] = useAtom(
    currentVercelProjectNameAtom
  );
  const router = useRouter();
  const [showClearDialog, setShowClearDialog] = useAtom(showClearDialogAtom);
  const [showDeleteDialog, setShowDeleteDialog] = useAtom(showDeleteDialogAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const [vercelProjects, setVercelProjects] = useAtom(vercelProjectsAtom);
  const [showNewProjectDialog, setShowNewProjectDialog] = useAtom(
    showNewProjectDialogAtom
  );
  const [newProjectName, setNewProjectName] = useAtom(newProjectNameAtom);
  const [creatingProject, setCreatingProject] = useAtom(creatingProjectAtom);

  // Component-local state for change project dialog (doesn't need to be shared)
  const [showChangeProjectDialog, setShowChangeProjectDialog] = useState(false);
  const [selectedNewProjectId, setSelectedNewProjectId] =
    useState<string>("none");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [runMode, setRunMode] = useState<"test" | "production">("test");
  const [allWorkflows, setAllWorkflows] = useState<
    Array<{
      id: string;
      name: string;
      updatedAt: string;
      vercelProjectId?: string | null;
    }>
  >([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<
    string | null
  >(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState(workflowName);

  const handleExecute = async (mode: "test" | "production" = runMode) => {
    if (!currentWorkflowId) {
      toast.error("Please save the workflow before executing");
      return;
    }

    if (mode === "production") {
      // Production run = call the deployed workflow's API
      if (!deploymentUrl) {
        toast.error("No deployment found. Deploy the workflow first.");
        return;
      }

      setIsExecuting(true);
      try {
        toast.info("Triggering production workflow...");

        // Construct the workflow-specific API endpoint
        const workflowFileName = workflowName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const workflowApiUrl = `${deploymentUrl}/api/workflows/${workflowFileName}`;

        // Call the deployed workflow's API endpoint
        const response = await fetch(workflowApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // Empty input for now
        });

        if (!response.ok) {
          throw new Error("Failed to trigger production workflow");
        }

        const result = await response.json();
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

    // Set all nodes to idle first
    for (const node of nodes) {
      updateNodeData({ id: node.id, data: { status: "idle" } });
    }

    try {
      // Call the server action to execute the workflow
      const result = await execute(currentWorkflowId, {});

      if (result.status === "error") {
        toast.error(result.error || "Workflow execution failed");
      } else {
        toast.success("Test run completed successfully");
      }

      // Update all nodes to success (in production, we'd stream status updates)
      // For now, just mark them all as success or check the result
      for (const node of nodes) {
        updateNodeData({
          id: node.id,
          data: { status: result.status === "error" ? "error" : "success" },
        });
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to execute workflow"
      );

      // Mark all nodes as error
      for (const node of nodes) {
        updateNodeData({ id: node.id, data: { status: "error" } });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkflowId) {
      return;
    }

    setIsSaving(true);
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      toast.success("Workflow saved successfully");
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

  const handleProjectFilterChange = (projectId: string | null) => {
    setSelectedProjectFilter(projectId);
  };

  const handleNewWorkflow = () => {
    router.push("/");
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setCreatingProject(true);
    try {
      const project = await createVercelProject({ name: newProjectName });

      // Update the projects list
      setVercelProjects((prev) => [...prev, project]);

      // Select the newly created project
      setSelectedProjectFilter(project.id);

      // Close dialog and clear form
      setShowNewProjectDialog(false);
      setNewProjectName("");
      toast.success("Project created successfully");
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    } finally {
      setCreatingProject(false);
    }
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

  const handleChangeProjectFromDialog = async () => {
    if (!currentWorkflowId) {
      return;
    }

    try {
      const newProjectId =
        selectedNewProjectId === "none" ? null : selectedNewProjectId;

      await workflowApi.update(currentWorkflowId, {
        vercelProjectId: newProjectId,
      });

      // Update the local state
      const selectedProject = vercelProjects.find((p) => p.id === newProjectId);
      setVercelProjectName(selectedProject?.name || null);

      setShowChangeProjectDialog(false);
      toast.success("Project changed successfully");
    } catch (error) {
      console.error("Failed to change project:", error);
      toast.error("Failed to change project. Please try again.");
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

      if (result.success) {
        setDeploymentUrl(result.deploymentUrl || null);
        toast.success("Workflow deployed successfully!");

        if (result.deploymentUrl) {
          toast.success(
            <div className="flex items-center gap-2">
              <span>Deployed to:</span>
              <a
                className="flex items-center gap-1 underline"
                href={result.deploymentUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {result.deploymentUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>,
            { duration: 10_000 }
          );
        }
      } else {
        throw new Error(result.error || "Deployment failed");
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

  // Load vercel projects
  const loadProjects = async () => {
    try {
      const projects = await getAllVercelProjects();
      setVercelProjects(projects || []);
    } catch (error) {
      console.error("Failed to load Vercel projects:", error);
    }
  };

  // Load projects and workflows on mount
  useEffect(() => {
    loadProjects();
    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync newWorkflowName when workflowName changes
  useEffect(() => {
    setNewWorkflowName(workflowName);
  }, [workflowName]);

  // Set initial project filter based on current workflow's project, or auto-select first project
  useEffect(() => {
    if (vercelProjects.length === 0) return;

    // If current workflow has a project, select that
    if (vercelProjectName) {
      const project = vercelProjects.find((p) => p.name === vercelProjectName);
      if (project) {
        setSelectedProjectFilter(project.id);
        return;
      }
    }

    // Auto-select first project
    setSelectedProjectFilter(vercelProjects[0].id);
  }, [vercelProjectName, vercelProjects]);

  // Filter workflows based on selected project
  const filteredWorkflows = selectedProjectFilter
    ? allWorkflows.filter((w) => w.vercelProjectId === selectedProjectFilter)
    : allWorkflows;

  const handleViewCode = async () => {
    if (!currentWorkflowId) {
      return;
    }

    try {
      const data = await getCode(currentWorkflowId);
      setGeneratedCode(data.code);
      setShowCodeDialog(true);
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Failed to generate code");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard");
  };

  return (
    <>
      <Panel
        className="flex flex-col-reverse gap-2 rounded-none border-none bg-transparent p-0.5 pr-3 sm:flex-row sm:items-center"
        position="top-left"
      >
        <ButtonGroup>
          <DropdownMenu onOpenChange={(open) => open && loadProjects()}>
            <ButtonGroupText asChild>
              <DropdownMenuTrigger className="cursor-pointer">
                <p className="font-medium text-sm">
                  {vercelProjects.find((p) => p.id === selectedProjectFilter)
                    ?.name || "Select project"}
                </p>
                <ChevronDown className="size-3 opacity-50" />
              </DropdownMenuTrigger>
            </ButtonGroupText>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onClick={() => setShowNewProjectDialog(true)}>
                <span>New Project</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {vercelProjects.map((project) => (
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  key={project.id}
                  onClick={() => handleProjectFilterChange(project.id)}
                >
                  <span className="truncate">{project.name}</span>
                  {project.id === selectedProjectFilter && (
                    <Check className="size-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu onOpenChange={(open) => open && loadWorkflows()}>
            <ButtonGroupText asChild>
              <DropdownMenuTrigger className="cursor-pointer">
                <p className="font-medium text-sm">{workflowName}</p>
                <ChevronDown className="size-3 opacity-50" />
              </DropdownMenuTrigger>
            </ButtonGroupText>
            <DropdownMenuContent align="start" className="w-64">
              {workflowId && (
                <>
                  <DropdownMenuItem onClick={handleNewWorkflow}>
                    <span>New Workflow</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {filteredWorkflows.length === 0 ? (
                <DropdownMenuItem disabled>No workflows found</DropdownMenuItem>
              ) : (
                filteredWorkflows.map((workflow) => (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={() => setShowRenameDialog(true)}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={() => setShowChangeProjectDialog(true)}
              >
                Move
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!currentWorkflowId}
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <NodeToolbar />
      </Panel>

      <Panel
        className="flex flex-col-reverse items-end gap-2 border-none bg-transparent p-0 sm:flex-row sm:items-center"
        position="top-right"
      >
        <ButtonGroup>
          <Button
            disabled={!canUndo || isGenerating}
            onClick={() => undo()}
            size="icon"
            title="Undo"
            variant="outline"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            disabled={!canRedo || isGenerating}
            onClick={() => redo()}
            size="icon"
            title="Redo"
            variant="outline"
          >
            <Redo2 className="size-4" />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            disabled={!currentWorkflowId || isGenerating || isSaving}
            onClick={handleSave}
            size="icon"
            title={isSaving ? "Saving..." : "Save workflow"}
            variant="outline"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
          </Button>
          <Button
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
            variant="outline"
          >
            {isDeploying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
          </Button>
          {deploymentUrl && (
            <Button
              onClick={() => window.open(deploymentUrl, "_blank")}
              size="icon"
              title="Open deployment"
              variant="outline"
            >
              <ExternalLink className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isGenerating}
                size="icon"
                title="More options"
                variant="outline"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={handleViewCode}
              >
                <Code className="size-4" />
                <span>View Generated Code</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={() => setShowChangeProjectDialog(true)}
              >
                <FolderOpen className="size-4" />
                <span>Change Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={nodes.length === 0}
                onClick={() => setShowClearDialog(true)}
              >
                <RotateCwIcon className="size-4" />
                <span>Clear Workflow</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={!currentWorkflowId}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-4 text-destructive" />
                <span>Delete Workflow</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>

        <ButtonGroup>
          <Button
            className="relative"
            disabled={isExecuting || nodes.length === 0 || isGenerating}
            onClick={() => handleExecute()}
            size="icon"
            variant="outline"
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
                className="w-6 px-1"
                disabled={isExecuting || nodes.length === 0 || isGenerating}
                size="icon"
                title="Select run mode"
                variant="outline"
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

        <div className="rounded-full border">
          <UserMenu />
        </div>
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

      {/* Delete Workflow Dialog */}
      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
            <DialogDescription>
              Enter a new name for your workflow.
            </DialogDescription>
          </DialogHeader>
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
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!newWorkflowName.trim()}
              onClick={handleRenameWorkflow}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{workflowName}&rdquo;? This
              will permanently delete the workflow and cannot be undone.
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

      {/* Change Project Dialog */}
      <Dialog
        onOpenChange={setShowChangeProjectDialog}
        open={showChangeProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Project</DialogTitle>
            <DialogDescription>
              Move this workflow to a different Vercel project or remove it from
              its current project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectSelect">Select Project</Label>
              <Select
                onValueChange={setSelectedNewProjectId}
                value={selectedNewProjectId}
              >
                <SelectTrigger id="projectSelect">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {vercelProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Current project: {vercelProjectName || "None"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowChangeProjectDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleChangeProjectFromDialog}>
              Change Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog
        onOpenChange={setShowNewProjectDialog}
        open={showNewProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new Vercel project for deploying your workflows
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newProjectName">Project Name</Label>
              <Input
                id="newProjectName"
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creatingProject) {
                    handleCreateProject();
                  }
                }}
                placeholder="my-project"
                value={newProjectName}
              />
              <p className="text-muted-foreground text-xs">
                Enter a descriptive name for your project
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowNewProjectDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={creatingProject || !newProjectName.trim()}
              onClick={handleCreateProject}
            >
              {creatingProject ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
