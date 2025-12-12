"use client";

import { Copy, Key, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type ApiKey = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  key?: string; // Only present when newly created
};

type ApiKeysDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApiKeysDialog({ open, onOpenChange }: ApiKeysDialogProps) {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/api-keys");
      if (!response.ok) {
        throw new Error("Failed to load API keys");
      }
      const keys = await response.json();
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open, loadApiKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || null }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create API key");
      }

      const newKey = await response.json();
      setNewlyCreatedKey(newKey.key);
      setApiKeys((prev) => [newKey, ...prev]);
      setShowCreateDialog(false);
      setNewKeyName("");
      toast.success("API key created successfully");
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteKeyId) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/api-keys/${deleteKeyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete API key");
      }

      setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
      toast.success("API key deleted");
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("Failed to delete API key");
    } finally {
      setDeleting(false);
      setDeleteKeyId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>API Keys</DialogTitle>
            <DialogDescription>
              Manage API keys for webhook authentication
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Newly created key warning */}
              {newlyCreatedKey && (
                <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
                  <p className="mb-2 font-medium text-sm text-yellow-600 dark:text-yellow-400">
                    Copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs">
                      {newlyCreatedKey}
                    </code>
                    <Button
                      onClick={() => copyToClipboard(newlyCreatedKey)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <Button
                    className="mt-2"
                    onClick={() => setNewlyCreatedKey(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* API Keys list */}
              {apiKeys.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Key className="mx-auto mb-2 size-8 opacity-50" />
                  <p>No API keys yet</p>
                  <p className="text-xs">
                    Create an API key to authenticate webhook requests
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((apiKey) => (
                    <div
                      className="flex items-center justify-between rounded-md border p-3"
                      key={apiKey.id}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {apiKey.keyPrefix}...
                          </code>
                          {apiKey.name && (
                            <span className="truncate text-sm">
                              {apiKey.name}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs">
                          Created {formatDate(apiKey.createdAt)}
                          {apiKey.lastUsedAt &&
                            ` · Last used ${formatDate(apiKey.lastUsedAt)}`}
                        </p>
                      </div>
                      <Button
                        onClick={() => setDeleteKeyId(apiKey.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <Plus className="mr-2 size-4" />
              New API Key
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for webhook authentication
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-api-key-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Label (optional)</Label>
                <Input
                  id="key-name"
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production, Testing"
                  value={newKeyName}
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button
              onClick={() => setShowCreateDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={creating}
              form="create-api-key-form"
              type="submit"
            >
              {creating ? <Spinner className="mr-2 size-4" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(isOpen) => !isOpen && setDeleteKeyId(null)}
        open={!!deleteKeyId}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? Any webhooks using
              this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Spinner className="mr-2 size-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
