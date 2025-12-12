"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, Check, Circle, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type Integration } from "@/lib/api-client";
import {
  integrationsAtom,
  integrationsVersionAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { cn } from "@/lib/utils";
import { getIntegration } from "@/plugins";
import { IntegrationFormDialog } from "@/components/settings/integration-form-dialog";

type IntegrationSelectorProps = {
  integrationType: IntegrationType;
  value?: string;
  onChange: (integrationId: string) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
  onAddConnection?: () => void;
};

export function IntegrationSelector({
  integrationType,
  value,
  onChange,
  disabled,
  onAddConnection,
}: IntegrationSelectorProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);
  const [globalIntegrations, setGlobalIntegrations] = useAtom(integrationsAtom);
  const integrationsVersion = useAtomValue(integrationsVersionAtom);
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);
  const lastVersionRef = useRef(integrationsVersion);
  const [hasFetched, setHasFetched] = useState(false);

  // Filter integrations from global cache
  const integrations = useMemo(
    () => globalIntegrations.filter((i) => i.type === integrationType),
    [globalIntegrations, integrationType]
  );

  // Check if we have cached data
  const hasCachedData = globalIntegrations.length > 0;

  const loadIntegrations = useCallback(async () => {
    try {
      const all = await api.integration.getAll();
      // Update global store so other components can access it
      setGlobalIntegrations(all);
      setHasFetched(true);
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  }, [setGlobalIntegrations]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations, integrationType]);

  // Listen for version changes (from other components creating/editing integrations)
  useEffect(() => {
    // Skip initial render - only react to actual version changes
    if (integrationsVersion !== lastVersionRef.current) {
      lastVersionRef.current = integrationsVersion;
      loadIntegrations();
    }
  }, [integrationsVersion, loadIntegrations]);

  // Auto-select single integration from cached data
  useEffect(() => {
    if (integrations.length === 1 && !value && !disabled) {
      onChange(integrations[0].id);
    }
  }, [integrations, value, disabled, onChange]);

  const handleNewIntegrationCreated = async (integrationId: string) => {
    await loadIntegrations();
    onChange(integrationId);
    setShowNewDialog(false);
    // Increment version to trigger re-fetch in other selectors
    setIntegrationsVersion((v) => v + 1);
  };

  const handleEditSuccess = async () => {
    await loadIntegrations();
    setEditingIntegration(null);
    setIntegrationsVersion((v) => v + 1);
  };

  const handleAddConnection = () => {
    if (onAddConnection) {
      onAddConnection();
    } else {
      setShowNewDialog(true);
    }
  };

  // Only show loading skeleton if we have no cached data and haven't fetched yet
  if (!hasCachedData && !hasFetched) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="size-4 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          <div className="size-6 shrink-0 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  const plugin = getIntegration(integrationType);
  const integrationLabel = plugin?.label || integrationType;

  // No integrations - show error button to add one
  if (integrations.length === 0) {
    return (
      <>
        <Button
          className="w-full justify-start gap-2 border-orange-500/50 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400"
          disabled={disabled}
          onClick={handleAddConnection}
          variant="outline"
        >
          <AlertTriangle className="size-4" />
          <span className="flex-1 text-left">
            Add {integrationLabel} connection
          </span>
          <Plus className="size-4" />
        </Button>

        <IntegrationFormDialog
          mode="create"
          onClose={() => setShowNewDialog(false)}
          onSuccess={handleNewIntegrationCreated}
          open={showNewDialog}
          preselectedType={integrationType}
        />
      </>
    );
  }

  // Single integration - show as outlined field (not radio-style)
  if (integrations.length === 1) {
    const integration = integrations[0];
    const displayName = integration.name || `${integrationLabel} API Key`;

    return (
      <>
        <div
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Check className="size-4 shrink-0 text-green-600" />
          <span className="flex-1 truncate">{displayName}</span>
          <Button
            className="size-6 shrink-0"
            disabled={disabled}
            onClick={() => setEditingIntegration(integration)}
            size="icon"
            variant="ghost"
          >
            <Pencil className="size-3" />
          </Button>
        </div>

        {editingIntegration && (
          <IntegrationFormDialog
            integration={editingIntegration}
            mode="edit"
            onClose={() => setEditingIntegration(null)}
            onDelete={async () => {
              await loadIntegrations();
              setEditingIntegration(null);
              setIntegrationsVersion((v) => v + 1);
            }}
            onSuccess={handleEditSuccess}
            open
          />
        )}
      </>
    );
  }

  // Multiple integrations - show radio-style selection list
  return (
    <>
      <div className="flex flex-col gap-1">
        {integrations.map((integration) => {
          const isSelected = value === integration.id;
          const displayName =
            integration.name || `${integrationLabel} API Key`;
          return (
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-[13px] py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              key={integration.id}
            >
              <button
                className="flex flex-1 items-center gap-2 text-left"
                disabled={disabled}
                onClick={() => onChange(integration.id)}
                type="button"
              >
                {isSelected ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{displayName}</span>
              </button>
              <Button
                className="size-6 shrink-0"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingIntegration(integration);
                }}
                size="icon"
                variant="ghost"
              >
                <Pencil className="size-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <IntegrationFormDialog
        mode="create"
        onClose={() => setShowNewDialog(false)}
        onSuccess={handleNewIntegrationCreated}
        open={showNewDialog}
        preselectedType={integrationType}
      />

      {editingIntegration && (
        <IntegrationFormDialog
          integration={editingIntegration}
          mode="edit"
          onClose={() => setEditingIntegration(null)}
          onDelete={async () => {
            await loadIntegrations();
            setEditingIntegration(null);
            setIntegrationsVersion((v) => v + 1);
          }}
          onSuccess={handleEditSuccess}
          open
        />
      )}
    </>
  );
}

