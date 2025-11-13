"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  FolderOpen,
  Loader2,
  Play,
  Redo2,
  Rocket,
  Save,
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
  DropdownMenuLabel,
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
import { useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";
import {
  canRedoAtom,
  canUndoAtom,
  clearWorkflowAtom,
  currentVercelProjectNameAtom,
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
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { ProjectIntegrationsDialog } from "../settings/project-integrations-dialog";
import { WorkflowIcon } from "../ui/workflow-icon";
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useAtom(
    hasUnsavedChangesAtom
  );
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
  const { data: session } = useSession();

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
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [newProjectNameForRename, setNewProjectNameForRename] = useState("");
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);
  const [deleteProjectConfirmation, setDeleteProjectConfirmation] =
    useState("");
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [projectWorkflowCount, setProjectWorkflowCount] = useState(0);
  const [showProjectIntegrationsDialog, setShowProjectIntegrationsDialog] =
    useState(false);
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
      setHasUnsavedChanges(false);
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
    clearWorkflow();
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

  const handleRenameProject = async () => {
    if (!(selectedProjectFilter && newProjectNameForRename.trim())) {
      return;
    }

    try {
      const { update: updateVercelProject } = await import(
        "@/app/actions/vercel-project/update"
      );
      await updateVercelProject(selectedProjectFilter, {
        name: newProjectNameForRename,
      });

      // Update the projects list
      setVercelProjects((prev) =>
        prev.map((p) =>
          p.id === selectedProjectFilter
            ? { ...p, name: newProjectNameForRename }
            : p
        )
      );

      setShowRenameProjectDialog(false);
      toast.success("Project renamed successfully");
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("Failed to rename project. Please try again.");
    }
  };

  const handleDeleteProject = async () => {
    if (
      !projectToDelete ||
      deleteProjectConfirmation !== projectToDelete.name
    ) {
      return;
    }

    try {
      const { deleteVercelProject } = await import(
        "@/app/actions/vercel-project/delete"
      );
      await deleteVercelProject(projectToDelete.id);

      // Remove from projects list
      setVercelProjects((prev) =>
        prev.filter((p) => p.id !== projectToDelete.id)
      );

      // If the deleted project was selected, clear the selection
      if (selectedProjectFilter === projectToDelete.id) {
        setSelectedProjectFilter(null);
      }

      setShowDeleteProjectDialog(false);
      setDeleteProjectConfirmation("");
      setProjectToDelete(null);
      toast.success("Project deleted successfully");

      // Reload workflows as they may have been affected
      const workflows = await workflowApi.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project. Please try again.");
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
  }, []);

  // Sync newWorkflowName when workflowName changes
  useEffect(() => {
    setNewWorkflowName(workflowName);
  }, [workflowName]);

  // Set initial project filter based on current workflow's project, or auto-select first project
  useEffect(() => {
    if (vercelProjects.length === 0) {
      return;
    }

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

  const _handleViewCode = async () => {
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
        <ButtonGroup className="h-9">
          {session && (
            <DropdownMenu onOpenChange={(open) => open && loadProjects()}>
              <ButtonGroupText asChild>
                <DropdownMenuTrigger className="cursor-pointer">
                  <FolderOpen className="size-4" />
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
                {selectedProjectFilter && (
                  <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                    {vercelProjects.find((p) => p.id === selectedProjectFilter)
                      ?.name || "Project"}
                  </DropdownMenuLabel>
                )}
                <DropdownMenuItem
                  disabled={!selectedProjectFilter}
                  onClick={() => setShowProjectIntegrationsDialog(true)}
                >
                  <span>Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!selectedProjectFilter}
                  onClick={() => {
                    const currentProject = vercelProjects.find(
                      (p) => p.id === selectedProjectFilter
                    );
                    if (currentProject) {
                      setNewProjectNameForRename(currentProject.name);
                      setShowRenameProjectDialog(true);
                    }
                  }}
                >
                  <span>Rename</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!selectedProjectFilter}
                  onClick={async () => {
                    const currentProject = vercelProjects.find(
                      (p) => p.id === selectedProjectFilter
                    );
                    if (currentProject) {
                      setProjectToDelete(currentProject);
                      setDeleteProjectConfirmation("");

                      // Fetch workflow count for this project
                      try {
                        const { getProjectWorkflowCount } = await import(
                          "@/app/actions/vercel-project/delete"
                        );
                        const count = await getProjectWorkflowCount(
                          currentProject.id
                        );
                        setProjectWorkflowCount(count);
                      } catch (error) {
                        console.error("Failed to get workflow count:", error);
                        setProjectWorkflowCount(0);
                      }

                      setShowDeleteProjectDialog(true);
                    }
                  }}
                >
                  <span>Delete</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                  Recent Projects
                </DropdownMenuLabel>
                {vercelProjects.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No projects found
                  </DropdownMenuItem>
                ) : (
                  vercelProjects.map((project) => (
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
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu onOpenChange={(open) => open && loadWorkflows()}>
            <ButtonGroupText asChild>
              <DropdownMenuTrigger className="cursor-pointer">
                <WorkflowIcon className="size-4" />
                <p className="font-medium text-sm">
                  {workflowId ? workflowName : "New Workflow"}
                </p>
                <ChevronDown className="size-3 opacity-50" />
              </DropdownMenuTrigger>
            </ButtonGroupText>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={handleNewWorkflow}
              >
                <span>New Workflow</span>
                {!workflowId && <Check className="size-4 shrink-0" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {currentWorkflowId && (
                <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                  {workflowName}
                </DropdownMenuLabel>
              )}
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={() => setShowRenameDialog(true)}
              >
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentWorkflowId}
                onClick={() => setShowChangeProjectDialog(true)}
              >
                <span>Move</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                Recent Workflows
              </DropdownMenuLabel>
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
        </ButtonGroup>
        <NodeToolbar />
      </Panel>

      <Panel
        className="flex flex-col-reverse items-end gap-2 border-none bg-transparent p-0 sm:flex-row sm:items-center"
        position="top-right"
      >
        {workflowId && (
          <>
            <ButtonGroup>
              <Button
                className="border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
                disabled={!canUndo || isGenerating}
                onClick={() => undo()}
                size="icon"
                title="Undo"
                variant="secondary"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                className="border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
                disabled={!canRedo || isGenerating}
                onClick={() => redo()}
                size="icon"
                title="Redo"
                variant="secondary"
              >
                <Redo2 className="size-4" />
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              <Button
                className="relative border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
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
                className="border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
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
                  className="border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
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
                className="relative border disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
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
                    className="w-6 border px-1 disabled:opacity-100 disabled:[&>svg]:text-muted-foreground"
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
                placeholder="My Workflows"
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

      {/* Rename Project Dialog */}
      <Dialog
        onOpenChange={setShowRenameProjectDialog}
        open={showRenameProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renameProjectName">Project Name</Label>
              <Input
                id="renameProjectName"
                onChange={(e) => setNewProjectNameForRename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameProject();
                  }
                }}
                placeholder="My Project"
                value={newProjectNameForRename}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowRenameProjectDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!newProjectNameForRename.trim()}
              onClick={handleRenameProject}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog
        onOpenChange={(open) => {
          setShowDeleteProjectDialog(open);
          if (!open) {
            setDeleteProjectConfirmation("");
            setProjectToDelete(null);
            setProjectWorkflowCount(0);
          }
        }}
        open={showDeleteProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              project &ldquo;{projectToDelete?.name}&rdquo;
              {projectWorkflowCount > 0 && (
                <>
                  {" "}
                  and <strong>{projectWorkflowCount}</strong> workflow
                  {projectWorkflowCount === 1 ? "" : "s"} associated with it
                </>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deleteProjectConfirmation">
                Type <strong>{projectToDelete?.name}</strong> to confirm
              </Label>
              <Input
                id="deleteProjectConfirmation"
                onChange={(e) => setDeleteProjectConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    deleteProjectConfirmation === projectToDelete?.name
                  ) {
                    handleDeleteProject();
                  }
                }}
                placeholder={projectToDelete?.name || ""}
                value={deleteProjectConfirmation}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowDeleteProjectDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteProjectConfirmation !== projectToDelete?.name}
              onClick={handleDeleteProject}
              variant="destructive"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Integrations Dialog */}
      <ProjectIntegrationsDialog
        onOpenChange={setShowProjectIntegrationsDialog}
        open={showProjectIntegrationsDialog}
        projectId={selectedProjectFilter}
        projectName={
          vercelProjects.find((p) => p.id === selectedProjectFilter)?.name ||
          null
        }
      />

      {/* Unsaved Changes Run Confirmation Dialog */}
      <Dialog
        onOpenChange={setShowUnsavedRunDialog}
        open={showUnsavedRunDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save before running
              the workflow?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowUnsavedRunDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleRunWithoutSaving} variant="outline">
              Run Without Saving
            </Button>
            <Button onClick={handleSaveAndRun}>Save and Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
