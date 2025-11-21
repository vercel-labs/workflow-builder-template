"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { IntegrationsManager } from "./integrations-manager";

type IntegrationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntegrationsDialog({
  open,
  onOpenChange,
}: IntegrationsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // IntegrationsManager handles its own loading
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open, loadAll]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Integrations</DialogTitle>
          <DialogDescription>
            Manage your integrations that can be used across workflows
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="mt-4">
            <IntegrationsManager showCreateDialog={showCreateDialog} />
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button onClick={() => setShowCreateDialog(true)} variant="outline">
            <Plus className="mr-2 size-4" />
            Add Integration
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
