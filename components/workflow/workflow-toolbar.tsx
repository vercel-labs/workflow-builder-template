'use client';

import { useAtom, useSetAtom } from 'jotai';
import { Play, Save, MoreVertical, Trash2, Pencil, Loader2, Undo2, Redo2 } from 'lucide-react';
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

  const handleExecute = async () => {
    if (!currentWorkflowId) {
      toast.error('Please save the workflow before executing');
      return;
    }

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
        toast.success('Workflow executed successfully');
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
      <span className="text-xl font-semibold">{workflowName}</span>
      {currentWorkflowId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 transition-opacity md:opacity-0 md:group-hover:opacity-100"
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
        onClick={handleExecute}
        disabled={isExecuting || nodes.length === 0 || isGenerating}
        variant="ghost"
        size="icon"
        title={isExecuting ? 'Running...' : 'Run workflow'}
      >
        <Play className="h-4 w-4" />
      </Button>
      <Button
        onClick={handleSave}
        variant="ghost"
        size="icon"
        disabled={!currentWorkflowId || isGenerating || isSaving}
        title={isSaving ? 'Saving...' : 'Save workflow'}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="More options" disabled={isGenerating}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
    </>
  );
}
