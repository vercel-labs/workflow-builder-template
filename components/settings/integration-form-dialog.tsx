"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  api,
  type Integration,
  type IntegrationWithConfig,
} from "@/lib/api-client";
import type {
  IntegrationConfig,
  IntegrationType,
} from "@/lib/types/integration";
import {
  getIntegration,
  getIntegrationLabels,
  getSortedIntegrationTypes,
} from "@/plugins";
import { SendGridIntegrationSection } from "./sendgrid-integration-section";
import { Web3WalletSection } from "./web3-wallet-section";

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
  config: Record<string, string | boolean>;
};

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_TYPES: IntegrationType[] = ["database"];
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

// Get all integration types (plugins + system)
const getIntegrationTypes = (): IntegrationType[] => [
  ...getSortedIntegrationTypes(),
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
    type: preselectedType || "resend",
    config: {},
  });

  const initializeConfigFromPlugin = useCallback(
    (pluginType: IntegrationType): Record<string, string | boolean> => {
      const plugin = getIntegration(pluginType);
      const config: Record<string, string | boolean> = {};
      if (plugin?.formFields) {
        for (const field of plugin.formFields) {
          if (field.defaultValue !== undefined) {
            config[field.configKey] = field.defaultValue as string | boolean;
          }
        }
      }
      return config;
    },
    []
  );

  const initializeConfigFromIntegration = useCallback(
    (
      integrationData: Integration | IntegrationWithConfig
    ): Record<string, string | boolean> => {
      const plugin = getIntegration(integrationData.type);
      const config: Record<string, string | boolean> = {};

      if (plugin?.formFields && "config" in integrationData) {
        const integrationConfig = integrationData.config as IntegrationConfig;
        for (const field of plugin.formFields) {
          if (integrationConfig[field.configKey] !== undefined) {
            config[field.configKey] = integrationConfig[field.configKey] as
              | string
              | boolean;
          } else if (field.defaultValue !== undefined) {
            config[field.configKey] = field.defaultValue as string | boolean;
          }
        }
      }

      return config;
    },
    []
  );

  useEffect(() => {
    if (integration) {
      const initialConfig = initializeConfigFromIntegration(integration);
      setFormData({
        name: integration.name,
        type: integration.type,
        config: initialConfig,
      });
    } else {
      const pluginType = preselectedType || "resend";
      const initialConfig = initializeConfigFromPlugin(pluginType);
      setFormData({
        name: "",
        type: pluginType,
        config: initialConfig,
      });
    }
  }, [
    integration,
    preselectedType,
    initializeConfigFromIntegration,
    initializeConfigFromPlugin,
  ]);

  const handleSave = async () => {
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

  const updateConfig = (key: string, value: string | boolean) => {
    setFormData({
      ...formData,
      config: { ...formData.config, [key]: value },
    });
  };

  const renderHelpText = (
    helpText?: string,
    helpLink?: { text: string; url: string }
  ) => {
    if (!(helpText || helpLink)) {
      return null;
    }
    return (
      <p className="text-muted-foreground text-xs">
        {helpText}
        {helpLink && (
          <a
            className="underline hover:text-foreground"
            href={helpLink.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {helpLink.text}
          </a>
        )}
      </p>
    );
  };

  const renderCheckboxField = (field: {
    id: string;
    type: string;
    label: string;
    configKey: string;
    defaultValue?: string | boolean;
    helpText?: string;
    helpLink?: { text: string; url: string };
  }) => {
    let checkboxValue: string | boolean | undefined =
      formData.config[field.configKey];
    if (checkboxValue === undefined) {
      checkboxValue =
        field.defaultValue !== undefined ? field.defaultValue : true;
    }
    const isChecked =
      typeof checkboxValue === "boolean"
        ? checkboxValue
        : checkboxValue === "true";

    return (
      <div className="flex items-center space-x-2" key={field.id}>
        <Checkbox
          checked={isChecked}
          id={field.id}
          onCheckedChange={(checked) =>
            updateConfig(field.configKey, checked === true)
          }
        />
        <Label className="cursor-pointer font-normal" htmlFor={field.id}>
          {field.label}
        </Label>
        {renderHelpText(field.helpText, field.helpLink)}
      </div>
    );
  };

  const renderInputField = (field: {
    id: string;
    type: string;
    label: string;
    configKey: string;
    placeholder?: string;
    helpText?: string;
    helpLink?: { text: string; url: string };
  }) => (
    <div className="space-y-2" key={field.id}>
      <Label htmlFor={field.id}>{field.label}</Label>
      <Input
        id={field.id}
        onChange={(e) => updateConfig(field.configKey, e.target.value)}
        placeholder={field.placeholder}
        type={field.type}
        value={(formData.config[field.configKey] as string) || ""}
      />
      {renderHelpText(field.helpText, field.helpLink)}
    </div>
  );

  const renderConfigFields = () => {
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
            value={(formData.config.url as string) || ""}
          />
          <p className="text-muted-foreground text-xs">
            Connection string in the format:
            postgresql://user:password@host:port/database
          </p>
        </div>
      );
    }

    // Handle Web3 wallet creation
    if (formData.type === "web3") {
      return <Web3WalletSection />;
    }

    // Get plugin form fields from registry
    const plugin = getIntegration(formData.type);
    if (!plugin?.formFields) {
      return null;
    }

    // Handle SendGrid integration with special checkbox logic
    if (formData.type === "sendgrid") {
      return (
        <SendGridIntegrationSection
          config={formData.config}
          formFields={plugin.formFields}
          updateConfig={updateConfig}
        />
      );
    }

    // Default rendering for other integrations
    return plugin.formFields.map((field) => {
      if (field.type === "checkbox") {
        return renderCheckboxField(field);
      }
      return renderInputField(field);
    });
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {(() => {
              if (formData.type === "web3" && mode === "create") {
                return "Web3 Wallet Setup";
              }
              if (mode === "edit") {
                return "Edit Integration";
              }
              return "Add Integration";
            })()}
          </DialogTitle>
          <DialogDescription>
            {(() => {
              if (formData.type === "web3" && mode === "create") {
                return "Create your Para wallet to use Web3 actions in workflows";
              }
              if (mode === "edit") {
                return "Update integration configuration";
              }
              return "Configure a new integration";
            })()}
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
                  {getIntegrationTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <IntegrationIcon
                          className="size-4"
                          integration={type}
                        />
                        {getLabel(type)}
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
              placeholder={`${getLabel(formData.type)} Integration`}
              value={formData.name}
            />
          </div>
        </div>

        <DialogFooter>
          {formData.type === "web3" ? (
            // Web3 wallet creation happens in the component, just show Close
            <Button onClick={() => onClose()}>Close</Button>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
