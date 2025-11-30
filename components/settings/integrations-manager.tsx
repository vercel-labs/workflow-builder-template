"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration, type IntegrationType } from "@/lib/api-client";
import { IntegrationFormDialog } from "./integration-form-dialog";

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  resend: "Resend",
  linear: "Linear",
  slack: "Slack",
  database: "Database",
  "ai-gateway": "AI Gateway",
  firecrawl: "Firecrawl",
  superagent: "Superagent",
};

type IntegrationsManagerProps = {
  showCreateDialog: boolean;
};

export function IntegrationsManager({
  showCreateDialog: externalShowCreateDialog,
}: IntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    try {
      await api.integration.delete(id);
      toast.success("Integration deleted");
      await loadIntegrations();
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {integrations.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No integrations configured yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((integration) => (
            <div
              className="flex items-center justify-between rounded-lg border p-4"
              key={integration.id}
            >
              <div className="flex items-center gap-3">
                <IntegrationIcon
                  className="size-8"
                  integration={
                    integration.type === "ai-gateway"
                      ? "vercel"
                      : integration.type
                  }
                />
                <div>
                  <p className="font-medium text-sm">{integration.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {INTEGRATION_TYPE_LABELS[integration.type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={testingId === integration.id}
                  onClick={() => handleTest(integration.id)}
                  size="sm"
                  variant="outline"
                >
                  {testingId === integration.id ? (
                    <Spinner className="size-4" />
                  ) : (
                    "Test"
                  )}
                </Button>
                <Button
                  onClick={() => setEditingIntegration(integration)}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  onClick={() => setDeletingId(integration.id)}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
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
