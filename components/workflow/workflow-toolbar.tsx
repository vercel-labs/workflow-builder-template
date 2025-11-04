'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useState, useEffect } from 'react';
import {
  Play,
  Save,
  MoreVertical,
  Trash2,
  Pencil,
  Loader2,
  Undo2,
  Redo2,
  FolderOpen,
  Rocket,
  ExternalLink,
  Code,
  ChevronDown,
  Check,
  FlaskConical,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  clearWorkflowAtom,
  isExecutingAtom,
  isGeneratingAtom,
  nodesAtom,
  edgesAtom,
  updateNodeDataAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  currentVercelProjectNameAtom,
  isEditingWorkflowNameAtom,
  editingWorkflowNameAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  isSavingAtom,
  undoAtom,
  redoAtom,
  canUndoAtom,
  canRedoAtom,
} from '@/lib/workflow-store';
import { vercelProjectsAtom } from '@/lib/atoms/vercel-projects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { workflowApi } from '@/lib/workflow-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppHeader } from '@/components/app-header';

export function WorkflowToolbar({}: { workflowId?: string }) {
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const clearWorkflow = useSetAtom(clearWorkflowAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [workflowName, setWorkflowName] = useAtom(currentWorkflowNameAtom);
  const [vercelProjectName, setVercelProjectName] = useAtom(currentVercelProjectNameAtom);
  const router = useRouter();
  const [isEditing, setIsEditing] = useAtom(isEditingWorkflowNameAtom);
  const [editingName, setEditingName] = useAtom(editingWorkflowNameAtom);
  const [showClearDialog, setShowClearDialog] = useAtom(showClearDialogAtom);
  const [showDeleteDialog, setShowDeleteDialog] = useAtom(showDeleteDialogAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const [vercelProjects] = useAtom(vercelProjectsAtom);

  // Component-local state for change project dialog (doesn't need to be shared)
  const [showChangeProjectDialog, setShowChangeProjectDialog] = useState(false);
  const [selectedNewProjectId, setSelectedNewProjectId] = useState<string>('none');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [runMode, setRunMode] = useState<'test' | 'production'>('test');

  const handleExecute = async (mode: 'test' | 'production' = runMode) => {
    if (!currentWorkflowId) {
      toast.error('Please save the workflow before executing');
      return;
    }

    if (mode === 'production') {
      // Production run = call the deployed workflow's API
      if (!deploymentUrl) {
        toast.error('No deployment found. Deploy the workflow first.');
        return;
      }

      setIsExecuting(true);
      try {
        toast.info('Triggering production workflow...');

        // Call the deployed workflow's API endpoint
        const response = await fetch(deploymentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Empty input for now
        });

        if (!response.ok) {
          throw new Error('Failed to trigger production workflow');
        }

        const result = await response.json();
        toast.success('Production workflow triggered successfully');
        console.log('Production workflow result:', result);
      } catch (error) {
        console.error('Failed to trigger production workflow:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to trigger production workflow'
        );
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // Test run = execute locally
    setIsExecuting(true);

    // Set all nodes to idle first
    nodes.forEach((node) => {
      updateNodeData({ id: node.id, data: { status: 'idle' } });
    });

    try {
      // Call the server API to execute the workflow
      const response = await fetch(`/api/workflows/${currentWorkflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute workflow');
      }

      const result = await response.json();

      if (result.status === 'error') {
        toast.error(result.error || 'Workflow execution failed');
      } else {
        toast.success('Test run completed successfully');
      }

      // Update all nodes to success (in production, we'd stream status updates)
      // For now, just mark them all as success or check the result
      nodes.forEach((node) => {
        updateNodeData({
          id: node.id,
          data: { status: result.status === 'error' ? 'error' : 'success' },
        });
      });
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute workflow');

      // Mark all nodes as error
      nodes.forEach((node) => {
        updateNodeData({ id: node.id, data: { status: 'error' } });
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStartEdit = () => {
    setEditingName(workflowName);
    setIsEditing(true);
  };

  const handleSaveWorkflowName = async () => {
    if (!editingName.trim() || !currentWorkflowId) {
      setIsEditing(false);
      return;
    }

    try {
      await workflowApi.update(currentWorkflowId, { name: editingName.trim() });
      setWorkflowName(editingName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingName(workflowName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveWorkflowName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSave = async () => {
    if (!currentWorkflowId) return;

    setIsSaving(true);
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
      toast.success('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearWorkflow = () => {
    clearWorkflow();
    setShowClearDialog(false);
  };

  const handleDeleteWorkflow = async () => {
    if (!currentWorkflowId) return;

    try {
      await workflowApi.delete(currentWorkflowId);
      setShowDeleteDialog(false);
      toast.success('Workflow deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow. Please try again.');
    }
  };

  const handleChangeProject = async () => {
    if (!currentWorkflowId) return;

    try {
      const newProjectId = selectedNewProjectId === 'none' ? null : selectedNewProjectId;

      await workflowApi.update(currentWorkflowId, {
        vercelProjectId: newProjectId,
      });

      // Update the local state
      const selectedProject = vercelProjects.find((p) => p.id === newProjectId);
      setVercelProjectName(selectedProject?.name || null);

      setShowChangeProjectDialog(false);
      toast.success('Project changed successfully');
    } catch (error) {
      console.error('Failed to change project:', error);
      toast.error('Failed to change project. Please try again.');
    }
  };

  const handleDeploy = async () => {
    if (!currentWorkflowId) {
      toast.error('Please save the workflow before deploying');
      return;
    }

    // Save workflow first
    try {
      await workflowApi.update(currentWorkflowId, { nodes, edges });
    } catch {
      toast.error('Failed to save workflow before deployment');
      return;
    }

    setIsDeploying(true);
    toast.info('Starting deployment to Vercel...');

    try {
      const response = await fetch(`/api/workflows/${currentWorkflowId}/deploy`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deploy workflow');
      }

      const result = await response.json();

      if (result.success) {
        setDeploymentUrl(result.deploymentUrl);
        toast.success('Workflow deployed successfully!');

        if (result.deploymentUrl) {
          toast.success(
            <div className="flex items-center gap-2">
              <span>Deployed to:</span>
              <a
                href={result.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 underline"
              >
                {result.deploymentUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>,
            { duration: 10000 }
          );
        }
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Failed to deploy workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deploy workflow');
    } finally {
      setIsDeploying(false);
    }
  };

  // Load deployment status on mount
  useEffect(() => {
    if (currentWorkflowId) {
      fetch(`/api/workflows/${currentWorkflowId}/deployment-status`)
        .then((res) => res.json())
        .then((data) => {
          setDeploymentUrl(data.deploymentUrl || null);
        })
        .catch((error) => {
          console.error('Failed to load deployment status:', error);
        });
    }
  }, [currentWorkflowId]);

  const handleViewCode = async () => {
    if (!currentWorkflowId) return;

    try {
      const response = await fetch(`/api/workflows/${currentWorkflowId}/code`);
      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const data = await response.json();
      setGeneratedCode(data.code);
      setShowCodeDialog(true);
    } catch (error) {
      console.error('Failed to generate code:', error);
      toast.error('Failed to generate code');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard');
  };

  const titleElement = isEditing ? (
    <Input
      value={editingName}
      onChange={(e) => setEditingName(e.target.value)}
      onBlur={handleSaveWorkflowName}
      onKeyDown={handleKeyDown}
      className="h-8 w-64"
      autoFocus
    />
  ) : (
    <div className="group flex items-center gap-2">
      {vercelProjectName && (
        <>
          <span className="text-muted-foreground text-xl font-semibold">{vercelProjectName}</span>
          <span className="text-muted-foreground text-xl">/</span>
        </>
      )}
      <span className="text-xl font-semibold">{workflowName}</span>
      {currentWorkflowId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleStartEdit}
          title="Rename workflow"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  const actions = (
    <>
      <Button
        onClick={() => undo()}
        disabled={!canUndo || isGenerating}
        variant="ghost"
        size="icon"
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => redo()}
        disabled={!canRedo || isGenerating}
        variant="ghost"
        size="icon"
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button
        onClick={handleSave}
        variant="ghost"
        size="icon"
        disabled={!currentWorkflowId || isGenerating || isSaving}
        title={isSaving ? 'Saving...' : 'Save workflow'}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </Button>
      <Button
        onClick={handleDeploy}
        disabled={isDeploying || nodes.length === 0 || isGenerating || !currentWorkflowId}
        variant="ghost"
        size="icon"
        title={isDeploying ? 'Deploying to production...' : 'Deploy to production'}
      >
        {isDeploying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
      </Button>
      {deploymentUrl && (
        <Button
          variant="ghost"
          size="icon"
          title="Open deployment"
          onClick={() => window.open(deploymentUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="More options" disabled={isGenerating}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewCode} disabled={!currentWorkflowId}>
            <Code className="mr-2 h-4 w-4" />
            <span>View Generated Code</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowChangeProjectDialog(true)}
            disabled={!currentWorkflowId}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Change Project</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowClearDialog(true)} disabled={nodes.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Clear Workflow</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={!currentWorkflowId}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete Workflow</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center">
        <Button
          onClick={() => handleExecute()}
          disabled={isExecuting || nodes.length === 0 || isGenerating}
          variant="ghost"
          size="icon"
          className="relative rounded-r-none"
          title={
            runMode === 'test'
              ? isExecuting
                ? 'Running test...'
                : 'Test workflow locally'
              : isExecuting
                ? 'Running on production...'
                : 'Run on production'
          }
        >
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {runMode === 'test' && !isExecuting && (
            <div className="absolute right-0.5 bottom-0.5">
              <FlaskConical
                className="text-muted-foreground"
                strokeWidth={2.5}
                style={{ width: '12px', height: '12px' }}
              />
            </div>
          )}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isExecuting || nodes.length === 0 || isGenerating}
              className="h-9 w-6 rounded-l-none border-l px-1"
              title="Select run mode"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={5}>
            <DropdownMenuItem onClick={() => setRunMode('test')}>
              <Play className="mr-2 h-4 w-4" />
              <span>Test Run (Local)</span>
              {runMode === 'test' && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRunMode('production')} disabled={!deploymentUrl}>
              <Play className="mr-2 h-4 w-4" />
              <span>Production Run</span>
              {runMode === 'production' && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      <AppHeader
        title={titleElement}
        showBackButton
        actions={actions}
        disableTitleLink
        useMobileTwoLineLayout
      />

      {/* Clear Workflow Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all nodes and connections? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearWorkflow}>
              Clear Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workflow Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{workflowName}&rdquo;? This will permanently
              delete the workflow and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkflow}>
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Generated Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Generated Workflow Code</DialogTitle>
            <DialogDescription>
              This is the generated code for your workflow using the Vercel Workflow SDK. Copy this
              code and deploy it to a Next.js project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <pre className="bg-muted overflow-auto rounded-lg p-4 text-sm">
              <code>{generatedCode}</code>
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeDialog(false)}>
              Close
            </Button>
            <Button onClick={handleCopyCode}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Project Dialog */}
      <Dialog open={showChangeProjectDialog} onOpenChange={setShowChangeProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Project</DialogTitle>
            <DialogDescription>
              Move this workflow to a different Vercel project or remove it from its current
              project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectSelect">Select Project</Label>
              <Select value={selectedNewProjectId} onValueChange={setSelectedNewProjectId}>
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
                Current project: {vercelProjectName || 'None'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeProject}>Change Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
