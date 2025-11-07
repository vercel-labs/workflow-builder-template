"use client";

import { useAtom } from "jotai";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { create as createVercelProject } from "@/app/actions/vercel-project/create";
import { getAll as getAllVercelProjects } from "@/app/actions/vercel-project/get-all";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  selectedProjectIdAtom,
  showNewProjectDialogAtom,
  vercelProjectsAtom,
} from "@/lib/atoms/vercel-projects";
import { useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";

export function WorkflowPrompt() {
  // Local component state (dumb state that doesn't need to persist)
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Jotai atoms (shared state that persists across mounts)
  const [selectedProjectId, setSelectedProjectId] = useAtom(
    selectedProjectIdAtom
  );
  const [vercelProjects, setVercelProjects] = useAtom(vercelProjectsAtom);
  const [showNewProjectDialog, setShowNewProjectDialog] = useAtom(
    showNewProjectDialogAtom
  );
  const [newProjectName, setNewProjectName] = useAtom(newProjectNameAtom);
  const [creatingProject, setCreatingProject] = useAtom(creatingProjectAtom);

  const router = useRouter();
  const { data: session } = useSession();

  // Load Vercel projects when component mounts
  useEffect(() => {
    if (!session) return;

    const loadVercelProjects = async () => {
      try {
        const projects = await getAllVercelProjects();
        console.log("Loaded Vercel projects:", projects);
        setVercelProjects(projects || []);
      } catch (error) {
        console.error("Failed to load Vercel projects:", error);
      }
    };

    loadVercelProjects();
  }, [session, setVercelProjects]);

  const handleProjectChange = (value: string) => {
    if (value === "new") {
      setShowNewProjectDialog(true);
    } else {
      setSelectedProjectId(value);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setCreatingProject(true);
    try {
      const project = await createVercelProject({ name: newProjectName });
      console.log("Created project:", project);

      // Update the projects list
      setVercelProjects((prev) => [...prev, project]);

      // Select the newly created project
      setSelectedProjectId(project.id);
      console.log("Selected project ID set to:", project.id);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    // Check if user is logged in
    if (!session) {
      // Redirect to login page
      router.push("/");
      return;
    }

    setIsGenerating(true);
    try {
      // Create empty workflow first
      const newWorkflow = await workflowApi.create({
        name: "AI Generated Workflow",
        description: `Generated from: ${prompt}`,
        nodes: [],
        edges: [],
        vercelProjectId:
          selectedProjectId === "none" ? undefined : selectedProjectId,
      });

      // Store the prompt in sessionStorage for the workflow page to use
      sessionStorage.setItem("ai-prompt", prompt);
      sessionStorage.setItem("generating-workflow-id", newWorkflow.id);

      // Navigate to the new workflow immediately
      router.push(`/workflows/${newWorkflow.id}?generating=true`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("Failed to create workflow. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <PromptInputProvider>
        <PromptInput
          className="bg-background"
          globalDrop
          multiple
          onSubmit={(message, event) => handleGenerate(event)}
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your workflow..."
              ref={textareaRef}
              value={prompt}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <Select
              disabled={isGenerating}
              onValueChange={handleProjectChange}
              value={selectedProjectId}
            >
              <SelectTrigger className="border-none shadow-none hover:bg-accent">
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {vercelProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
                <SelectItem className="text-primary" value="new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <PromptInputSubmit status={isGenerating ? "submitted" : "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>

      {/* New Project Dialog */}
      <Dialog
        onOpenChange={setShowNewProjectDialog}
        open={showNewProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Vercel Project</DialogTitle>
            <DialogDescription>
              Create a new local project entry. This will be stored in your
              database and can be linked to workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                disabled={creatingProject}
                id="projectName"
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creatingProject) {
                    handleCreateProject();
                  }
                }}
                placeholder="my-vercel-project"
                value={newProjectName}
              />
              <p className="text-muted-foreground text-xs">
                Enter a descriptive name for your project
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={creatingProject}
              onClick={() => {
                setShowNewProjectDialog(false);
                setNewProjectName("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={creatingProject || !newProjectName.trim()}
              onClick={handleCreateProject}
            >
              {creatingProject ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
