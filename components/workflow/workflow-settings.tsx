"use client";

import { SettingsIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workflowApi } from "@/lib/workflow-api";

type WorkflowSettingsProps = {
  workflowName: string;
  workflowId: string;
};

export const WorkflowSettings = ({
  workflowName,
  workflowId,
}: WorkflowSettingsProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [name, setName] = useState(workflowName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await workflowApi.update(workflowId, {
        name: name || undefined,
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to save workflow settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await workflowApi.delete(workflowId);
      setShowDeleteDialog(false);
      setOpen(false);

      // Navigate to home page after deletion
      router.push("/");
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!(isSaving || isDeleting)) {
      setOpen(newOpen);
      // Reset form when closing
      if (!newOpen) {
        setName(workflowName);
      }
    }
  };

  return (
    <>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button size="icon" variant="outline">
            <SettingsIcon className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Workflow Settings</DialogTitle>
            <DialogDescription>
              Manage your workflow settings and configuration
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                disabled={isSaving}
                id="workflow-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workflow name"
                value={name}
              />
            </div>

            <div className="rounded-md bg-destructive/10 p-4">
              <div className="flex flex-col gap-2">
                <Label className="text-destructive">Danger Zone</Label>
                <p className="text-destructive/80 text-xs">
                  Permanently delete this workflow. This action cannot be
                  undone.
                </p>
                <Button
                  className="mt-4 w-fit"
                  disabled={isSaving || isDeleting}
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Delete Workflow
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => handleOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSaving || !name.trim()} onClick={handleSave}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workflowName}"? This action
              cannot be undone and all workflow data will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete Workflow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
