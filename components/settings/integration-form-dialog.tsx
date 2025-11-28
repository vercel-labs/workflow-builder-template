"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration, type IntegrationType } from "@/lib/api-client";

type IntegrationFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (integrationId: string) => void;
  integration?: Integration | null;
  mode: "create" | "edit";
  preselectedType?: IntegrationType;
};

type IntegrationFormData = {
  name: string;
  type: IntegrationType;
  config: Record<string, string>;
};

const INTEGRATION_TYPES: IntegrationType[] = [
  "ai-gateway",
  "database",
  "firecrawl",
  "linear",
  "resend",
  "slack",
  "v0",
];

const INTEGRATION_LABELS: Record<IntegrationType, string> = {
  resend: "Resend",
  linear: "Linear",
  slack: "Slack",
  database: "Database",
  "ai-gateway": "AI Gateway",
  firecrawl: "Firecrawl",
  v0: "v0",
};

export function IntegrationFormDialog({
  open,
  onClose,
  onSuccess,
  integration,
  mode,
  preselectedType,
}: IntegrationFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: "",
    type: preselectedType || "resend",
    config: {},
  });

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        type: integration.type,
        config: {},
      });
    } else {
      setFormData({
        name: "",
        type: preselectedType || "resend",
        config: {},
      });
    }
  }, [integration, preselectedType]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Generate a default name if none provided
      const integrationName =
        formData.name.trim() ||
        `${INTEGRATION_LABELS[formData.type]} Integration`;

      if (mode === "edit" && integration) {
        await api.integration.update(integration.id, {
          name: integrationName,
          config: formData.config,
        });
        toast.success("Integration updated");
        onSuccess?.(integration.id);
      } else {
        const newIntegration = await api.integration.create({
          name: integrationName,
          type: formData.type,
          config: formData.config,
        });
        toast.success("Integration created");
        onSuccess?.(newIntegration.id);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save integration:", error);
      toast.error("Failed to save integration");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setFormData({
      ...formData,
      config: { ...formData.config, [key]: value },
    });
  };

  const renderConfigFields = () => {
    switch (formData.type) {
      case "resend":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                onChange={(e) => updateConfig("apiKey", e.target.value)}
                placeholder="re_..."
                type="password"
                value={formData.config.apiKey || ""}
              />
              <p className="text-muted-foreground text-xs">
                Get your API key from{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://resend.com/api-keys"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                onChange={(e) => updateConfig("fromEmail", e.target.value)}
                placeholder="noreply@example.com"
                value={formData.config.fromEmail || ""}
              />
            </div>
          </>
        );
      case "linear":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                onChange={(e) => updateConfig("apiKey", e.target.value)}
                placeholder="lin_api_..."
                type="password"
                value={formData.config.apiKey || ""}
              />
              <p className="text-muted-foreground text-xs">
                Get your API key from{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://linear.app/settings/account/security"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  linear.app/settings/account/security
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamId">Team ID</Label>
              <Input
                id="teamId"
                onChange={(e) => updateConfig("teamId", e.target.value)}
                placeholder="team_..."
                value={formData.config.teamId || ""}
              />
            </div>
          </>
        );
      case "slack":
        return (
          <div className="space-y-2">
            <Label htmlFor="apiKey">Bot Token</Label>
            <Input
              id="apiKey"
              onChange={(e) => updateConfig("apiKey", e.target.value)}
              placeholder="xoxb-..."
              type="password"
              value={formData.config.apiKey || ""}
            />
            <p className="text-muted-foreground text-xs">
              Create a Slack app and get your bot token from{" "}
              <a
                className="underline hover:text-foreground"
                href="https://api.slack.com/apps"
                rel="noopener noreferrer"
                target="_blank"
              >
                api.slack.com/apps
              </a>
            </p>
          </div>
        );
      case "database":
        return (
          <div className="space-y-2">
            <Label htmlFor="url">Database URL</Label>
            <Input
              id="url"
              onChange={(e) => updateConfig("url", e.target.value)}
              placeholder="postgresql://..."
              type="password"
              value={formData.config.url || ""}
            />
            <p className="text-muted-foreground text-xs">
              Connection string in the format:
              postgresql://user:password@host:port/database
            </p>
          </div>
        );
      case "ai-gateway":
        return (
          <div className="space-y-2">
            <Label htmlFor="apiKey">AI Gateway API Key</Label>
            <Input
              id="apiKey"
              onChange={(e) => updateConfig("apiKey", e.target.value)}
              placeholder="API Key"
              type="password"
              value={formData.config.apiKey || ""}
            />
            <p className="text-muted-foreground text-xs">
              Get your API key from{" "}
              <a
                className="underline hover:text-foreground"
                href="https://vercel.com/ai-gateway"
                rel="noopener noreferrer"
                target="_blank"
              >
                vercel.com/ai-gateway
              </a>
            </p>
          </div>
        );
      case "firecrawl":
        return (
          <div className="space-y-2">
            <Label htmlFor="firecrawlApiKey">API Key</Label>
            <Input
              id="firecrawlApiKey"
              onChange={(e) => updateConfig("firecrawlApiKey", e.target.value)}
              placeholder="fc-..."
              type="password"
              value={formData.config.firecrawlApiKey || ""}
            />
            <p className="text-muted-foreground text-xs">
              Get your API key from{" "}
              <a
                className="underline hover:text-foreground"
                href="https://firecrawl.dev/app/api-keys"
                rel="noopener noreferrer"
                target="_blank"
              >
                firecrawl.dev
              </a>
            </p>
          </div>
        );
      case "v0":
        return (
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              onChange={(e) => updateConfig("apiKey", e.target.value)}
              placeholder="v0_..."
              type="password"
              value={formData.config.apiKey || ""}
            />
            <p className="text-muted-foreground text-xs">
              Get your API key from{" "}
              <a
                className="underline hover:text-foreground"
                href="https://v0.dev/chat/settings/keys"
                rel="noopener noreferrer"
                target="_blank"
              >
                v0.dev/chat/settings/keys
              </a>
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Integration" : "Add Integration"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update integration configuration"
              : "Configure a new integration"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                disabled={!!preselectedType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as IntegrationType,
                    config: {},
                  })
                }
                value={formData.type}
              >
                <SelectTrigger className="w-full" id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <IntegrationIcon
                          className="size-4"
                          integration={type === "ai-gateway" ? "vercel" : type}
                        />
                        {INTEGRATION_LABELS[type]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {renderConfigFields()}

          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={`${INTEGRATION_LABELS[formData.type]} Integration`}
              value={formData.name}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={saving} onClick={() => onClose()} variant="outline">
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? <Spinner className="mr-2 size-4" /> : null}
            {mode === "edit" ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
