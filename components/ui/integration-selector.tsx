"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AlertTriangle,
  Check,
  Circle,
  Pencil,
  Plus,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IntegrationFormDialog } from "@/components/settings/integration-form-dialog";
import { Button } from "@/components/ui/button";
import {
  aiGatewayStatusAtom,
  aiGatewayTeamsAtom,
  aiGatewayTeamsFetchedAtom,
  aiGatewayTeamsLoadingAtom,
  openAiGatewayConsentModalAtom,
} from "@/lib/ai-gateway/state";
import { api, type Integration } from "@/lib/api-client";
import {
  integrationsAtom,
  integrationsVersionAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { cn } from "@/lib/utils";
import { getIntegration } from "@/plugins";

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
  onOpenSettings,
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

  // AI Gateway user keys state
  const [aiGatewayStatus, setAiGatewayStatus] = useAtom(aiGatewayStatusAtom);
  const [aiGatewayStatusFetched, setAiGatewayStatusFetched] = useState(false);
  const openConsentModal = useSetAtom(openAiGatewayConsentModalAtom);

  // AI Gateway teams state (pre-loaded for consent modal)
  const [teams, setTeams] = useAtom(aiGatewayTeamsAtom);
  const [teamsFetched, setTeamsFetched] = useAtom(aiGatewayTeamsFetchedAtom);
  const setTeamsLoading = useSetAtom(aiGatewayTeamsLoadingAtom);

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

  // Load AI Gateway status for ai-gateway type
  useEffect(() => {
    if (integrationType === "ai-gateway" && !aiGatewayStatusFetched) {
      api.aiGateway
        .getStatus()
        .then((status) => {
          setAiGatewayStatus(status);
          setAiGatewayStatusFetched(true);
        })
        .catch(() => {
          setAiGatewayStatusFetched(true);
        });
    }
  }, [integrationType, aiGatewayStatusFetched, setAiGatewayStatus]);

  // Load AI Gateway teams when status indicates user can use managed keys
  useEffect(() => {
    if (
      integrationType === "ai-gateway" &&
      aiGatewayStatus?.enabled &&
      aiGatewayStatus?.isVercelUser &&
      !teamsFetched
    ) {
      setTeamsLoading(true);
      api.aiGateway
        .getTeams()
        .then((response) => {
          setTeams(response.teams);
          // Only mark as fetched if we got teams - empty might mean expired token
          if (response.teams.length > 0) {
            setTeamsFetched(true);
          }
        })
        .catch(() => {
          // Don't mark as fetched on error - allow retry
        })
        .finally(() => {
          setTeamsLoading(false);
        });
    }
  }, [
    integrationType,
    aiGatewayStatus,
    teamsFetched,
    setTeams,
    setTeamsFetched,
    setTeamsLoading,
  ]);

  // Refresh teams in background (always try if we should use managed keys)
  useEffect(() => {
    if (
      integrationType === "ai-gateway" &&
      aiGatewayStatus?.enabled &&
      aiGatewayStatus?.isVercelUser
    ) {
      // Always try to refresh teams - handles token refresh after re-auth
      api.aiGateway
        .getTeams()
        .then((response) => {
          if (response.teams.length > 0) {
            setTeams(response.teams);
            setTeamsFetched(true);
          }
        })
        .catch(() => {
          // Silently fail background refresh
        });
    }
    // Only run on mount and when status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationType, aiGatewayStatus?.enabled, aiGatewayStatus?.isVercelUser]);

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

  // Auto-select first integration when none is selected or current selection is invalid
  useEffect(() => {
    if (integrations.length > 0 && !disabled) {
      // Check if current value exists in available integrations
      const currentExists = value && integrations.some((i) => i.id === value);
      if (!currentExists) {
        // Prefer managed integrations, fall back to first available
        const managed = integrations.find((i) => i.isManaged);
        onChange(managed?.id || integrations[0].id);
      }
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

  const handleDelete = async () => {
    await loadIntegrations();
    setEditingIntegration(null);
    setIntegrationsVersion((v) => v + 1);
    // Refresh AI Gateway status if this is an AI Gateway integration
    if (integrationType === "ai-gateway") {
      const status = await api.aiGateway.getStatus();
      setAiGatewayStatus(status);
    }
  };

  // Check if AI Gateway managed keys should be used
  const shouldUseManagedKeys =
    integrationType === "ai-gateway" &&
    aiGatewayStatus?.enabled &&
    aiGatewayStatus?.isVercelUser &&
    !aiGatewayStatus?.hasManagedKey;

  const handleConsentSuccess = useCallback(async (integrationId: string) => {
    await loadIntegrations();
    onChange(integrationId);
    setIntegrationsVersion((v) => v + 1);
    // Refetch AI Gateway status
    const status = await api.aiGateway.getStatus();
    setAiGatewayStatus(status);
  }, [loadIntegrations, onChange, setIntegrationsVersion, setAiGatewayStatus]);

  const handleAddConnection = useCallback(() => {
    if (onAddConnection) {
      onAddConnection();
    } else if (shouldUseManagedKeys) {
      // For AI Gateway with managed keys enabled, show consent modal
      openConsentModal({
        onConsent: handleConsentSuccess,
        onManualEntry: () => {
          setShowNewDialog(true);
        },
      });
    } else {
      setShowNewDialog(true);
    }
  }, [onAddConnection, shouldUseManagedKeys, openConsentModal, handleConsentSuccess]);

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

  // Separate managed and manual integrations for AI Gateway
  const managedIntegrations = integrations.filter((i) => i.isManaged);
  const manualIntegrations = integrations.filter((i) => !i.isManaged);

  // No integrations - show add button
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
            onDelete={handleDelete}
            onSuccess={handleEditSuccess}
            open
          />
        )}
      </>
    );
  }

  // Multiple integrations or AI Gateway with option to add managed key
  return (
    <>
      <div className="flex flex-col gap-1">
        {/* Show managed integrations first */}
        {managedIntegrations.map((integration) => {
          const isSelected = value === integration.id;
          const displayName = integration.name || `${integrationLabel} API Key`;
          return (
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-[13px] py-1.5 text-sm transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
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

        {/* Show manual integrations */}
        {manualIntegrations.map((integration) => {
          const isSelected = value === integration.id;
          const displayName =
            integration.name || `${integrationLabel} API Key`;
          return (
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-[13px] py-1.5 text-sm transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
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

        {onOpenSettings && (
          <button
            className="flex w-full items-center gap-2 rounded-md px-[13px] py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted/50 hover:text-foreground"
            disabled={disabled}
            onClick={onOpenSettings}
            type="button"
          >
            <Settings className="size-4 shrink-0" />
            <span>Manage all connections</span>
          </button>
        )}
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
          onDelete={handleDelete}
          onSuccess={handleEditSuccess}
          open
        />
      )}
    </>
  );
}
