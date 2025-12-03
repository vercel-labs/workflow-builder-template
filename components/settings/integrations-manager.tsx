"use client";

import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getIntegrationLabels } from "@/plugins";
import { IntegrationFormDialog } from "./integration-form-dialog";

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

type IntegrationsManagerProps = {
  showCreateDialog: boolean;
  onIntegrationChange?: () => void;
};

export function IntegrationsManager({
  showCreateDialog: externalShowCreateDialog,
  onIntegrationChange,
}: IntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Sync external dialog state
  useEffect(() => {
    setShowCreateDialog(externalShowCreateDialog);
  }, [externalShowCreateDialog]);

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.integration.getAll();
      setIntegrations(data);
    } catch (error) {
      console.error("Failed to load integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  // Group integrations by type
  const groupedIntegrations = useMemo(() => {
    const groups = new Map<string, Integration[]>();
    const labels = getIntegrationLabels() as Record<string, string>;

    for (const integration of integrations) {
      const type = integration.type;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)?.push(integration);
    }

    // Sort groups by label
    return Array.from(groups.entries())
      .map(([type, items]) => ({
        type,
        label: labels[type] || SYSTEM_INTEGRATION_LABELS[type] || type,
        items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [integrations]);

  const handleDelete = async (id: string) => {
    try {
      await api.integration.delete(id);
      await loadIntegrations();
      onIntegrationChange?.();
    } catch (error) {
      console.error("Failed to delete integration:", error);
      toast.error("Failed to delete integration");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      const result = await api.integration.testConnection(id);

      if (result.status === "success") {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.message || "Connection test failed");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Connection test failed"
      );
    } finally {
      setTestingId(null);
    }
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setEditingIntegration(null);
  };

  const handleDialogSuccess = async () => {
    await loadIntegrations();
    onIntegrationChange?.();
  };

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {integrations.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No integrations configured yet
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {groupedIntegrations.map((group) => (
            <Collapsible
              key={group.type}
              onOpenChange={() => toggleGroup(group.type)}
              open={expandedGroups.has(group.type)}
            >
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50">
                <IntegrationIcon
                  className="size-4"
                  integration={
                    group.type === "ai-gateway" ? "vercel" : group.type
                  }
                />
                <span className="font-medium">{group.label}</span>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expandedGroups.has(group.type) && "rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 py-1">
                  {group.items.map((integration) => (
                    <div
                      className="flex items-center justify-between rounded-md py-1.5 pr-2 pl-[33px]"
                      key={integration.id}
                    >
                      <span className="text-sm">{integration.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          className="h-7 px-2"
                          disabled={testingId === integration.id}
                          onClick={() => handleTest(integration.id)}
                          size="sm"
                          variant="outline"
                        >
                          {testingId === integration.id ? (
                            <Spinner className="size-3" />
                          ) : (
                            <span className="text-xs">Test</span>
                          )}
                        </Button>
                        <Button
                          className="size-7"
                          onClick={() => setEditingIntegration(integration)}
                          size="icon"
                          variant="outline"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          className="size-7"
                          onClick={() => setDeletingId(integration.id)}
                          size="icon"
                          variant="outline"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {(showCreateDialog || editingIntegration) && (
        <IntegrationFormDialog
          integration={editingIntegration}
          mode={editingIntegration ? "edit" : "create"}
          onClose={handleDialogClose}
          onSuccess={handleDialogSuccess}
          open
        />
      )}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null);
          }
        }}
        open={deletingId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this integration? Workflows using
              this integration will fail until a new one is selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  handleDelete(deletingId);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
