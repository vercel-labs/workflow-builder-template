'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { workflowApi, type SavedWorkflow } from '@/lib/workflow-api';
import { WorkflowPrompt } from './workflow-prompt';
import { AppHeader } from '@/components/app-header';
import { getRelativeTime } from '@/lib/utils/time';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';

interface WorkflowsListProps {
  limit?: number;
  showPrompt?: boolean;
  enableSelection?: boolean;
}

export function WorkflowsList({
  limit,
  showPrompt = true,
  enableSelection = false,
}: WorkflowsListProps = {}) {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const loadWorkflows = useCallback(async () => {
    // Only load workflows if user is logged in
    if (!session) {
      setLoading(false);
      setWorkflows([]);
      return;
    }

    try {
      setLoading(true);
      const data = await workflowApi.getAll();
      // Filter out the auto-save workflow
      const filtered = data.filter((w) => w.name !== '__current__');
      setWorkflows(filtered);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const displayedWorkflows = limit ? workflows.slice(0, limit) : workflows;

  const handleOpenWorkflow = (id: string) => {
    router.push(`/workflows/${id}`);
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedWorkflows.map((w) => w.id)));
    }
  };

  const handleBulkDelete = async () => {
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => workflowApi.delete(id)));
      setSelectedIds(new Set());
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflows:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <>
      <div className={showPrompt ? 'p-8' : 'flex-1 p-8'}>
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-muted-foreground text-sm font-medium">
                {loading
                  ? 'Loading...'
                  : workflows.length === 0
                    ? 'No Workflows'
                    : limit
                      ? 'Recent Workflows'
                      : 'All Workflows'}
              </h2>
              {enableSelection && displayedWorkflows.length > 0 && !loading && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.size === displayedWorkflows.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {enableSelection && selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete {selectedIds.size} {selectedIds.size === 1 ? 'Workflow' : 'Workflows'}
                </Button>
              )}
              {limit && workflows.length > limit && !loading && (
                <Button variant="ghost" size="sm" onClick={() => router.push('/workflows')}>
                  View All
                </Button>
              )}
            </div>
          </div>

          {/* Reserve minimum height to prevent layout shift */}
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground text-sm">Loading workflows...</div>
              </div>
            ) : displayedWorkflows.length > 0 ? (
              <div className="divide-y">
                {/* User's workflows */}
                {displayedWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-4 transition-colors"
                  >
                    {enableSelection && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(workflow.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(workflow.id);
                        }}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300"
                      />
                    )}
                    <button
                      className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                      onClick={() => handleOpenWorkflow(workflow.id)}
                    >
                      <div className="mb-1 flex items-center justify-between gap-4">
                        <div className="min-w-0 truncate font-medium">{workflow.name}</div>
                        <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{getRelativeTime(workflow.updatedAt)}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflows</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} workflow
              {selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
