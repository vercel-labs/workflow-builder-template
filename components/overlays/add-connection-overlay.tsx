"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  aiGatewayStatusAtom,
  aiGatewayTeamsAtom,
  aiGatewayTeamsLoadingAtom,
} from "@/lib/ai-gateway/state";
import { api } from "@/lib/api-client";
import type { IntegrationType } from "@/lib/types/integration";
import {
  getIntegration,
  getIntegrationLabels,
  getSortedIntegrationTypes,
} from "@/plugins";
import { getIntegrationDescriptions } from "@/plugins/registry";
import { AiGatewayConsentOverlay } from "./ai-gateway-consent-overlay";
import { ConfirmOverlay } from "./confirm-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_TYPES: IntegrationType[] = ["database"];
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};
const SYSTEM_INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  database: "Connect to PostgreSQL databases",
};

// Get all integration types (plugins + system)
const getIntegrationTypes = (): IntegrationType[] => [
  ...getSortedIntegrationTypes(),
  ...SYSTEM_INTEGRATION_TYPES,
];

// Get label for any integration type
const getLabel = (type: IntegrationType): string =>
  getIntegrationLabels()[type] || SYSTEM_INTEGRATION_LABELS[type] || type;

// Get description for any integration type
const getDescription = (type: IntegrationType): string =>
  getIntegrationDescriptions()[type] ||
  SYSTEM_INTEGRATION_DESCRIPTIONS[type] ||
  "";

type AddConnectionOverlayProps = {
  overlayId: string;
  onSuccess?: (integrationId: string) => void;
};

/**
 * Overlay for selecting a connection type to add
 */
export function AddConnectionOverlay({
  overlayId,
  onSuccess,
}: AddConnectionOverlayProps) {
  const { push, closeAll } = useOverlay();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  // AI Gateway state
  const aiGatewayStatus = useAtomValue(aiGatewayStatusAtom);
  const setAiGatewayStatus = useSetAtom(aiGatewayStatusAtom);
  const setTeams = useSetAtom(aiGatewayTeamsAtom);
  const setTeamsLoading = useSetAtom(aiGatewayTeamsLoadingAtom);

  const shouldUseManagedKeys =
    aiGatewayStatus?.enabled && aiGatewayStatus?.isVercelUser;

  const integrationTypes = getIntegrationTypes();

  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return integrationTypes;
    }
    const query = searchQuery.toLowerCase();
    return integrationTypes.filter((type) =>
      getLabel(type).toLowerCase().includes(query)
    );
  }, [integrationTypes, searchQuery]);

  const showConsentModalWithCallbacks = useCallback(() => {
    push(AiGatewayConsentOverlay, {
      onConsent: (integrationId: string) => {
        onSuccess?.(integrationId);
        closeAll();
      },
    });
  }, [push, closeAll, onSuccess]);

  const handleSelectType = (type: IntegrationType) => {
    // If selecting AI Gateway and managed keys are available, show consent modal
    if (type === "ai-gateway" && shouldUseManagedKeys) {
      showConsentModalWithCallbacks();
      return;
    }

    // If AI Gateway but need to fetch status first
    if (type === "ai-gateway" && aiGatewayStatus === null) {
      api.aiGateway.getStatus().then((status) => {
        setAiGatewayStatus(status);
        if (status?.enabled && status?.isVercelUser) {
          setTeamsLoading(true);
          api.aiGateway
            .getTeams()
            .then((response) => {
              setTeams(response.teams);
            })
            .finally(() => {
              setTeamsLoading(false);
              showConsentModalWithCallbacks();
            });
        } else {
          push(ConfigureConnectionOverlay, { type, onSuccess });
        }
      });
      return;
    }

    // Push to configure overlay
    push(ConfigureConnectionOverlay, { type, onSuccess });
  };

  return (
    <Overlay overlayId={overlayId} title="Add Connection">
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Select a service to connect
      </p>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={!isMobile}
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
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
            filteredTypes.map((type) => {
              const description = getDescription(type);
              return (
                <button
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  key={type}
                  onClick={() => handleSelectType(type)}
                  type="button"
                >
                  <IntegrationIcon
                    className="size-5 shrink-0"
                    integration={type === "ai-gateway" ? "vercel" : type}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{getLabel(type)}</span>
                    {description && (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        - {description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Overlay>
  );
}

type ConfigureConnectionOverlayProps = {
  overlayId: string;
  type: IntegrationType;
  onSuccess?: (integrationId: string) => void;
};

/**
 * Secret field component for password inputs
 */
function SecretField({
  fieldId,
  label,
  configKey,
  placeholder,
  helpText,
  helpLink,
  value,
  onChange,
}: {
  fieldId: string;
  label: string;
  configKey: string;
  placeholder?: string;
  helpText?: string;
  helpLink?: { url: string; text: string };
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        className="flex-1"
        id={fieldId}
        onChange={(e) => onChange(configKey, e.target.value)}
        placeholder={placeholder}
        type="password"
        value={value}
      />
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

/**
 * Overlay for configuring a new connection
 */
export function ConfigureConnectionOverlay({
  overlayId,
  type,
  onSuccess,
}: ConfigureConnectionOverlayProps) {
  const { push, closeAll } = useOverlay();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const doSave = async () => {
    try {
      setSaving(true);
      const newIntegration = await api.integration.create({
        name: name.trim(),
        type,
        config,
      });
      toast.success("Connection created");
      onSuccess?.(newIntegration.id);
      closeAll();
    } catch (error) {
      console.error("Failed to save integration:", error);
      toast.error("Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const hasConfig = Object.values(config).some((v) => v && v.length > 0);
    if (!hasConfig) {
      toast.error("Please enter credentials");
      return;
    }

    // Test before saving
    try {
      setSaving(true);
      setTestResult(null);

      const result = await api.integration.testCredentials({ type, config });

      if (result.status === "error") {
        // Show confirmation to save anyway
        push(ConfirmOverlay, {
          title: "Connection Test Failed",
          message: `The test failed: ${result.message}\n\nDo you want to save anyway?`,
          confirmLabel: "Save Anyway",
          onConfirm: async () => {
            await doSave();
          },
        });
        setSaving(false);
        return;
      }

      await doSave();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to test connection";
      push(ConfirmOverlay, {
        title: "Connection Test Failed",
        message: `${message}\n\nDo you want to save anyway?`,
        confirmLabel: "Save Anyway",
        onConfirm: async () => {
          await doSave();
        },
      });
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const hasConfig = Object.values(config).some((v) => v && v.length > 0);
    if (!hasConfig) {
      toast.error("Please enter credentials first");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const result = await api.integration.testCredentials({ type, config });
      setTestResult(result);
      if (result.status === "success") {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.message || "Connection failed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed";
      setTestResult({ status: "error", message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  // Get plugin form fields
  const plugin = getIntegration(type);
  const formFields = plugin?.formFields;

  // Render config fields
  const renderConfigFields = () => {
    if (type === "database") {
      return (
        <SecretField
          configKey="url"
          fieldId="url"
          helpText="Connection string in the format: postgresql://user:password@host:port/database"
          label="Database URL"
          onChange={updateConfig}
          placeholder="postgresql://user:password@host:port/database"
          value={config.url || ""}
        />
      );
    }

    if (!formFields) return null;

    return formFields.map((field) => {
      if (field.type === "password") {
        return (
          <SecretField
            configKey={field.configKey}
            fieldId={field.id}
            helpLink={field.helpLink}
            helpText={field.helpText}
            key={field.id}
            label={field.label}
            onChange={updateConfig}
            placeholder={field.placeholder}
            value={config[field.configKey] || ""}
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
            value={config[field.configKey] || ""}
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
  };

  return (
    <Overlay
      actions={[
        {
          label: "Test",
          variant: "outline",
          onClick: handleTest,
          loading: testing,
          disabled: saving,
        },
        { label: "Create", onClick: handleSave, loading: saving },
      ]}
      overlayId={overlayId}
      title={`Add ${getLabel(type)}`}
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Enter your credentials
      </p>

      <div className="space-y-4">
        {renderConfigFields()}

        <div className="space-y-2">
          <Label htmlFor="name">Label (Optional)</Label>
          <Input
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production, Personal, Work"
            value={name}
          />
        </div>
      </div>
    </Overlay>
  );
}
