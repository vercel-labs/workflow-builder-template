"use client";

import { useSetAtom } from "jotai";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { integrationsVersionAtom } from "@/lib/integrations-store";
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
  const [filter, setFilter] = useState("");
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);
  // Track if any changes were made during this dialog session
  const hasChangesRef = useRef(false);

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
      // Reset changes tracking when dialog opens
      hasChangesRef.current = false;
      // Reset create dialog state when opening
      setShowCreateDialog(false);
      // Reset filter when opening
      setFilter("");
    }
  }, [open, loadAll]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && hasChangesRef.current) {
        // Increment version to trigger re-fetch in all IntegrationSelectors
        setIntegrationsVersion((v) => v + 1);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, setIntegrationsVersion]
  );

  const handleIntegrationChange = useCallback(() => {
    hasChangesRef.current = true;
  }, []);

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
          <DialogDescription>
            Manage API keys and credentials used by your workflows
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter connections..."
                value={filter}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <IntegrationsManager
                filter={filter}
                onCreateDialogClose={() => setShowCreateDialog(false)}
                onIntegrationChange={handleIntegrationChange}
                showCreateDialog={showCreateDialog}
              />
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button onClick={() => setShowCreateDialog(true)} variant="outline">
            <Plus className="mr-2 size-4" />
            Add Connection
          </Button>
          <Button onClick={() => handleClose(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
