"use client";

import { ArrowLeft, Check, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration } from "@/lib/api-client";
import type { IntegrationType } from "@/lib/types/integration";
import {
  getIntegration,
  getIntegrationLabels,
  getSortedIntegrationTypes,
} from "@/plugins";

type IntegrationFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (integrationId: string) => void;
  onDelete?: () => void;
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

// Get all integration types (plugins + system)
const getIntegrationTypes = (): IntegrationType[] => [
  ...getSortedIntegrationTypes(),
  ...SYSTEM_INTEGRATION_TYPES,
];

// Get label for any integration type
const getLabel = (type: IntegrationType): string =>
  getIntegrationLabels()[type] || SYSTEM_INTEGRATION_LABELS[type] || type;

function SecretField({
  fieldId,
  label,
  configKey,
  placeholder,
  helpText,
  helpLink,
  value,
  onChange,
  isEditMode,
}: {
  fieldId: string;
  label: string;
  configKey: string;
  placeholder?: string;
  helpText?: string;
  helpLink?: { url: string; text: string };
  value: string;
  onChange: (key: string, value: string) => void;
  isEditMode: boolean;
}) {
  const [isEditing, setIsEditing] = useState(!isEditMode);
  const hasNewValue = value.length > 0;

  // In edit mode, start with "configured" state
  // User can click to change, or clear after entering a new value
  if (isEditMode && !isEditing && !hasNewValue) {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{label}</Label>
        <div className="flex items-center gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3">
            <Check className="size-4 text-green-600" />
            <span className="text-muted-foreground text-sm">Configured</span>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Pencil className="mr-1.5 size-3" />
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          autoFocus={isEditMode && isEditing}
          className="flex-1"
          id={fieldId}
          onChange={(e) => onChange(configKey, e.target.value)}
          placeholder={placeholder}
          type="password"
          value={value}
        />
        {isEditMode && (isEditing || hasNewValue) && (
          <Button
            onClick={() => {
              onChange(configKey, "");
              setIsEditing(false);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {(helpText || helpLink) && (
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
      )}
    </div>
  );
}

function ConfigFields({
  formData,
  updateConfig,
  isEditMode,
}: {
  formData: IntegrationFormData;
  updateConfig: (key: string, value: string) => void;
  isEditMode: boolean;
}) {
  if (!formData.type) {
    return null;
  }

  // Handle system integrations with hardcoded fields
  if (formData.type === "database") {
    return (
      <SecretField
        configKey="url"
        fieldId="url"
        helpText="Connection string in the format: postgresql://user:password@host:port/database"
        isEditMode={isEditMode}
        label="Database URL"
        onChange={updateConfig}
        placeholder="postgresql://user:password@host:port/database"
        value={formData.config.url || ""}
      />
    );
  }

  // Get plugin form fields from registry
  const plugin = getIntegration(formData.type);
  if (!plugin?.formFields) {
    return null;
  }

  return plugin.formFields.map((field) => {
    const isSecretField = field.type === "password";

    if (isSecretField) {
      return (
        <SecretField
          configKey={field.configKey}
          fieldId={field.id}
          helpLink={field.helpLink}
          helpText={field.helpText}
          isEditMode={isEditMode}
          key={field.id}
          label={field.label}
          onChange={updateConfig}
          placeholder={field.placeholder}
          value={formData.config[field.configKey] || ""}
        />
      );
    }

    return (
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
    );
  });
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  deleting,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Connection</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this connection? Workflows using it
            will fail until a new one is configured.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={onDelete}>
            {deleting ? <Spinner className="mr-2 size-4" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TypeSelector({
  searchQuery,
  onSearchChange,
  filteredTypes,
  onSelectType,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredTypes: IntegrationType[];
  onSelectType: (type: IntegrationType) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          autoFocus
          className="pl-9"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search services..."
          value={searchQuery}
        />
      </div>
      <div className="max-h-[300px] space-y-1 overflow-y-auto">
        {filteredTypes.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No services found
          </p>
        ) : (
          filteredTypes.map((type) => (
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
              key={type}
              onClick={() => onSelectType(type)}
              type="button"
            >
              <IntegrationIcon
                className="size-5"
                integration={type === "ai-gateway" ? "vercel" : type}
              />
              <span className="font-medium">{getLabel(type)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function IntegrationFormDialog({
  open,
  onClose,
  onSuccess,
  onDelete,
  integration,
  mode,
  preselectedType,
}: IntegrationFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: "",
    type: preselectedType || null,
    config: {},
  });

  // Step: "select" for type selection list, "configure" for form
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
    setSearchQuery("");
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

      const integrationName = formData.name.trim();

      if (mode === "edit" && integration) {
        await api.integration.update(integration.id, {
          name: integrationName,
          config: formData.config,
        });
        toast.success("Connection updated");
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

  const handleDelete = async () => {
    if (!integration) {
      return;
    }

    try {
      setDeleting(true);
      await api.integration.delete(integration.id);
      toast.success("Connection deleted");
      onDelete?.();
      onClose();
    } catch (error) {
      console.error("Failed to delete integration:", error);
      toast.error("Failed to delete connection");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setFormData({
      ...formData,
      config: { ...formData.config, [key]: value },
    });
  };

  const integrationTypes = getIntegrationTypes();

  const filteredIntegrationTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return integrationTypes;
    }
    const query = searchQuery.toLowerCase();
    return integrationTypes.filter((type) =>
      getLabel(type).toLowerCase().includes(query)
    );
  }, [integrationTypes, searchQuery]);

  const getDialogTitle = () => {
    if (mode === "edit") {
      return "Edit Connection";
    }
    if (step === "select") {
      return "Add Connection";
    }
    return `Add ${formData.type ? getLabel(formData.type) : ""} Connection`;
  };

  const getDialogDescription = () => {
    if (mode === "edit") {
      return "Update your connection credentials";
    }
    if (step === "select") {
      return "Select a service to connect";
    }
    return "Enter your credentials";
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <TypeSelector
            filteredTypes={filteredIntegrationTypes}
            onSearchChange={setSearchQuery}
            onSelectType={handleSelectType}
            searchQuery={searchQuery}
          />
        ) : (
          <form
            className="space-y-4"
            id="integration-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <ConfigFields
              formData={formData}
              isEditMode={mode === "edit"}
              updateConfig={updateConfig}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Label (Optional)</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Production, Personal, Work"
                value={formData.name}
              />
            </div>
          </form>
        )}

        <DialogFooter
          className={step === "configure" ? "sm:justify-between" : ""}
        >
          {step === "configure" && mode === "create" && !preselectedType && (
            <Button disabled={saving} onClick={handleBack} variant="ghost">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          )}
          {step === "configure" && mode === "edit" && (
            <Button
              disabled={saving || deleting}
              onClick={() => setShowDeleteConfirm(true)}
              variant="ghost"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          )}
          {step === "select" ? (
            <Button onClick={() => onClose()} variant="outline">
              Cancel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                disabled={saving || deleting}
                onClick={() => onClose()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={saving || deleting}
                form="integration-form"
                type="submit"
              >
                {saving ? <Spinner className="mr-2 size-4" /> : null}
                {mode === "edit" ? "Update" : "Create"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmDialog
        deleting={deleting}
        onDelete={handleDelete}
        onOpenChange={setShowDeleteConfirm}
        open={showDeleteConfirm}
      />
    </Dialog>
  );
}
