"use client";

import { Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/auth-client";
import { getRelativeTime } from "@/lib/utils/time";
import { type SavedWorkflow, workflowApi } from "@/lib/workflow-api";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

export const WorkflowsDialog = () => {
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
      const filtered = data.filter((w) => w.name !== "__current__");
      setWorkflows(filtered);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

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
    if (selectedIds.size === workflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workflows.map((w) => w.id)));
    }
  };

  const handleBulkDelete = async () => {
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => workflowApi.delete(id))
      );
      setSelectedIds(new Set());
      await loadWorkflows();
    } catch (error) {
      console.error("Failed to delete workflows:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            className="mt-2 h-auto rounded-none text-xs shadow-none outline-none focus-visible:ring-0"
            size="sm"
            variant="link"
          >
            View all
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>All Workflows</DialogTitle>
          </DialogHeader>
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-medium text-muted-foreground text-sm">
                  {loading ? (
                    <Spinner />
                  ) : workflows.length === 0 ? (
                    "No Workflows"
                  ) : (
                    "All Workflows"
                  )}
                </h2>
                {workflows.length > 0 && !loading && (
                  <Button onClick={handleSelectAll} size="sm" variant="ghost">
                    {selectedIds.size === workflows.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <Button
                    disabled={deleting}
                    onClick={() => setShowDeleteDialog(true)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete {selectedIds.size}{" "}
                    {selectedIds.size === 1 ? "Workflow" : "Workflows"}
                  </Button>
                )}
              </div>
            </div>

            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground text-sm">
                    Loading workflows...
                  </div>
                </div>
              ) : workflows.length > 0 ? (
                <div className="divide-y">
                  {workflows.map((workflow) => (
                    <div
                      className="flex w-full items-center gap-3 px-4 py-4 transition-colors hover:bg-accent/50"
                      key={workflow.id}
                    >
                      <input
                        checked={selectedIds.has(workflow.id)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(workflow.id);
                        }}
                        type="checkbox"
                      />
                      <button
                        className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                        onClick={() => handleOpenWorkflow(workflow.id)}
                      >
                        <div className="mb-1 flex items-center justify-between gap-4">
                          <div className="min-w-0 truncate font-medium">
                            {workflow.name}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
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
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflows</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} workflow
              {selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
