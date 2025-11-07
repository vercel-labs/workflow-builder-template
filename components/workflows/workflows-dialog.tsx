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
  DialogFooter,
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
        <DialogContent className="max-h-[85vh] max-w-3xl gap-0 p-0">
          <DialogHeader className="border-b px-6 py-4 pr-14">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Your Workflows</DialogTitle>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(85vh-8rem)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Spinner />
                  <p className="text-muted-foreground text-sm">
                    Loading workflows...
                  </p>
                </div>
              </div>
            ) : workflows.length > 0 ? (
              <div className="divide-y">
                {workflows.map((workflow) => (
                  <div
                    className="group flex w-full items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/50"
                    key={workflow.id}
                  >
                    <input
                      checked={selectedIds.has(workflow.id)}
                      className="h-4 w-4 cursor-pointer rounded border-input transition-colors checked:border-primary checked:bg-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(workflow.id);
                      }}
                      type="checkbox"
                    />
                    <button
                      className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 text-left"
                      onClick={() => handleOpenWorkflow(workflow.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="min-w-0 truncate font-semibold text-base leading-none transition-colors group-hover:text-primary">
                          {workflow.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Updated {getRelativeTime(workflow.updatedAt)}
                        </span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">No workflows yet</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Create your first workflow to get started
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            {workflows.length > 0 && !loading && (
              <div className="flex shrink-0 items-center gap-2">
                <Button onClick={handleSelectAll} size="sm" variant="outline">
                  {selectedIds.size === workflows.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    disabled={deleting}
                    onClick={() => setShowDeleteDialog(true)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete ({selectedIds.size})
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflows?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} workflow
              {selectedIds.size > 1 ? "s" : ""}? This action cannot be undone
              and all workflow data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
