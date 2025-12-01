"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  fetchIntegrationsAtom,
  integrationsAtom,
  integrationsFetchedAtom,
  integrationsLoadingAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { IntegrationFormDialog } from "@/components/settings/integration-form-dialog";

type IntegrationSelectorProps = {
  integrationType: IntegrationType;
  value?: string;
  onChange: (integrationId: string) => void;
  onOpenSettings?: () => void;
  label?: string;
  disabled?: boolean;
};

export function IntegrationSelector({
  integrationType,
  value,
  onChange,
  onOpenSettings,
  label,
  disabled,
}: IntegrationSelectorProps) {
  const allIntegrations = useAtomValue(integrationsAtom);
  const loading = useAtomValue(integrationsLoadingAtom);
  const fetched = useAtomValue(integrationsFetchedAtom);
  const fetchIntegrations = useSetAtom(fetchIntegrationsAtom);
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Filter integrations by type
  const integrations = useMemo(
    () => allIntegrations.filter((i) => i.type === integrationType),
    [allIntegrations, integrationType]
  );

  // Fetch integrations on mount if not already fetched
  useEffect(() => {
    if (!fetched && !loading) {
      fetchIntegrations();
    }
  }, [fetched, loading, fetchIntegrations]);

  // Auto-select if only one option and nothing selected yet
  useEffect(() => {
    if (integrations.length === 1 && !value && fetched) {
      onChange(integrations[0].id);
    }
  }, [integrations, value, fetched, onChange]);

  const handleValueChange = (newValue: string) => {
    if (newValue === "__new__") {
      setShowNewDialog(true);
    } else if (newValue === "__manage__") {
      onOpenSettings?.();
    } else {
      onChange(newValue);
    }
  };

  const handleNewIntegrationCreated = async (integrationId: string) => {
    await fetchIntegrations();
    onChange(integrationId);
    setShowNewDialog(false);
  };

  if (loading || !fetched) {
    return (
      <Select disabled value="">
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="space-y-2">
        <Select disabled={disabled} onValueChange={handleValueChange} value={value}>
          <SelectTrigger className="flex-1">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-500/50 p-0.5">
                <AlertTriangle className="size-3 text-white" />
              </div>
              <SelectValue placeholder="No integrations" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__new__">New Integration</SelectItem>
            <SelectItem value="__manage__">Manage Integrations</SelectItem>
          </SelectContent>
        </Select>
        
        <IntegrationFormDialog
          mode="create"
          onClose={() => setShowNewDialog(false)}
          onSuccess={handleNewIntegrationCreated}
          open={showNewDialog}
          preselectedType={integrationType}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-muted-foreground text-sm">{label}</span>}
      <Select disabled={disabled} onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select integration..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__new__">New Integration</SelectItem>
          <SelectItem value="__manage__">Manage Integrations</SelectItem>
          {integrations.length > 0 && <Separator className="my-1" />}
          {integrations.map((integration) => (
            <SelectItem key={integration.id} value={integration.id}>
              {integration.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <IntegrationFormDialog
        mode="create"
        onClose={() => setShowNewDialog(false)}
        onSuccess={handleNewIntegrationCreated}
        open={showNewDialog}
        preselectedType={integrationType}
      />
    </div>
  );
}

