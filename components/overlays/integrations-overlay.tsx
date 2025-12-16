"use client";

import { useSetAtom } from "jotai";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IntegrationsManager } from "@/components/settings/integrations-manager";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { integrationsVersionAtom } from "@/lib/integrations-store";
import { AddConnectionOverlay } from "./add-connection-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

type IntegrationsOverlayProps = {
  overlayId: string;
};

export function IntegrationsOverlay({ overlayId }: IntegrationsOverlayProps) {
  const { push, closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);
  const hasChangesRef = useRef(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    hasChangesRef.current = false;
    setFilter("");
  }, [loadAll]);

  const handleClose = useCallback(() => {
    if (hasChangesRef.current) {
      setIntegrationsVersion((v) => v + 1);
    }
    closeAll();
  }, [closeAll, setIntegrationsVersion]);

  const handleIntegrationChange = useCallback(() => {
    hasChangesRef.current = true;
  }, []);

  const handleAddConnection = () => {
    push(AddConnectionOverlay, {
      onSuccess: handleIntegrationChange,
    });
  };

  return (
    <Overlay
      actions={[
        {
          label: "Add Connection",
          variant: "outline",
          onClick: handleAddConnection,
        },
        { label: "Done", onClick: handleClose },
      ]}
      overlayId={overlayId}
      title="Connections"
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Manage API keys and credentials used by your workflows
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
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
              onIntegrationChange={handleIntegrationChange}
            />
          </div>
        </div>
      )}
    </Overlay>
  );
}
