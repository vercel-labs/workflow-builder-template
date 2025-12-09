"use client";

import { ArrowLeft } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration } from "@/lib/api-client";
import type { IntegrationType } from "@/lib/types/integration";
import { cn } from "@/lib/utils";
import {
  getIntegration,
  getIntegrationLabels,
  getSortedIntegrationTypes,
} from "@/plugins";

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
  type: IntegrationType | null;
  config: Record<string, string>;
};

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_TYPES: IntegrationType[] = ["database"];
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

// Get all integration types (plugins that require integration + system)
// Excludes plugins with requiresIntegration: false (like Native)
const getIntegrationTypes = (): IntegrationType[] => [
  ...getSortedIntegrationTypes().filter((type) => {
    const plugin = getIntegration(type);
    return plugin?.requiresIntegration !== false;
  }),
  ...SYSTEM_INTEGRATION_TYPES,
];

// Get label for any integration type
const getLabel = (type: IntegrationType): string =>
  getIntegrationLabels()[type] || SYSTEM_INTEGRATION_LABELS[type] || type;

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
    type: preselectedType || null,
    config: {},
  });

  // Step: "select" for type selection grid, "configure" for form
  const [step, setStep] = useState<"select" | "configure">(
    preselectedType || mode === "edit" ? "configure" : "select"
  );

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        type: integration.type,
        config: {},
      });
      setStep("configure");
    } else {
      setFormData({
        name: "",
        type: preselectedType || null,
        config: {},
      });
      setStep(preselectedType ? "configure" : "select");
    }
  }, [integration, preselectedType]);

  const handleSelectType = (type: IntegrationType) => {
    setFormData({
      name: "",
      type,
      config: {},
    });
    setStep("configure");
  };

  const handleBack = () => {
    setStep("select");
    setFormData({
      name: "",
      type: null,
      config: {},
    });
  };

  const handleSave = async () => {
    if (!formData.type) {
      return;
    }

    try {
      setSaving(true);

      // Generate a default name if none provided
      const integrationName =
        formData.name.trim() || `${getLabel(formData.type)} Integration`;

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
    if (!formData.type) {
      return null;
    }

    // Handle system integrations with hardcoded fields
    if (formData.type === "database") {
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
    }

    // Get plugin form fields from registry
    const plugin = getIntegration(formData.type);
    if (!plugin?.formFields) {
      return null;
    }

    return plugin.formFields.map((field) => (
      <div className="space-y-2" key={field.id}>
        <Label htmlFor={field.id}>{field.label}</Label>
        <Input
          id={field.id}
          onChange={(e) => updateConfig(field.configKey, e.target.value)}
          placeholder={field.placeholder}
          type={field.type}
          value={formData.config[field.configKey] || ""}
        />
        {(field.helpText || field.helpLink) && (
          <p className="text-muted-foreground text-xs">
            {field.helpText}
            {field.helpLink && (
              <a
                className="underline hover:text-foreground"
                href={field.helpLink.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {field.helpLink.text}
              </a>
            )}
          </p>
        )}
      </div>
    ));
  };

  const integrationTypes = getIntegrationTypes();

  const getDialogTitle = () => {
    if (mode === "edit") {
      return "Edit Integration";
    }
    if (step === "select") {
      return "Choose Integration";
    }
    return `Add ${formData.type ? getLabel(formData.type) : ""} Integration`;
  };

  const getDialogDescription = () => {
    if (mode === "edit") {
      return "Update integration configuration";
    }
    if (step === "select") {
      return "Select an integration type to configure";
    }
    return "Configure your integration";
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent
        className={cn(step === "select" ? "max-w-2xl" : "max-w-md")}
      >
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="grid grid-cols-3 gap-2 py-2">
            {integrationTypes.map((type) => (
              <button
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
                key={type}
                onClick={() => handleSelectType(type)}
                type="button"
              >
                <IntegrationIcon
                  className="size-8"
                  integration={type === "ai-gateway" ? "vercel" : type}
                />
                <span className="text-center font-medium">
                  {getLabel(type)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {renderConfigFields()}

            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={
                  formData.type
                    ? `${getLabel(formData.type)} Integration`
                    : "Integration"
                }
                value={formData.name}
              />
            </div>
          </div>
        )}

        <DialogFooter
          className={cn(
            step === "select" ? "sm:justify-start" : "sm:justify-between"
          )}
        >
          {step === "configure" && mode === "create" && !preselectedType && (
            <Button disabled={saving} onClick={handleBack} variant="ghost">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          )}
          {step === "select" ? (
            <Button onClick={() => onClose()} variant="outline">
              Cancel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                disabled={saving}
                onClick={() => onClose()}
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={saving} onClick={handleSave}>
                {saving ? <Spinner className="mr-2 size-4" /> : null}
                {mode === "edit" ? "Update" : "Create"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
