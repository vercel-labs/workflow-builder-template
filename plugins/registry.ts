import type { IntegrationType } from "@/lib/db/integrations";

/**
 * Integration Plugin Definition
 * All information needed to register a new integration in one place
 */
export type IntegrationPlugin = {
  // Basic info
  type: IntegrationType;
  label: string;
  description: string;

  // Icon (either a named icon from integrations or an inline SVG component)
  icon: {
    type: "image" | "svg" | "lucide";
    value: string; // For image: "/integrations/name.svg", for SVG: component name, for lucide: icon name
    svgComponent?: React.ComponentType<{ className?: string }>;
  };

  // Settings component
  settingsComponent: React.ComponentType<{
    apiKey: string;
    hasKey?: boolean;
    onApiKeyChange: (key: string) => void;
    showCard?: boolean;
    config?: Record<string, string>;
    onConfigChange?: (key: string, value: string) => void;
  }>;

  // Form fields for the integration dialog
  formFields: Array<{
    id: string;
    label: string;
    type: "text" | "password" | "url";
    placeholder?: string;
    helpText?: string;
    helpLink?: { text: string; url: string };
    configKey: string; // Which key in IntegrationConfig to store the value
  }>;

  // Credential mapping (how to map config to environment variables)
  credentialMapping: (
    config: Record<string, unknown>
  ) => Record<string, string>;

  // Testing configuration
  testConfig?: {
    testFunction: (
      credentials: Record<string, string>
    ) => Promise<{ success: boolean; error?: string }>;
  };

  // Actions provided by this integration
  actions: Array<{
    id: string;
    label: string;
    description: string;
    category: string;
    icon: React.ComponentType<{ className?: string }>;

    // Step configuration
    stepFunction: string; // Name of the exported function in the step file
    stepImportPath: string; // Path to import from, relative to plugins/[plugin-name]/steps/

    // Config fields for the action
    configFields: React.ComponentType<{
      config: Record<string, unknown>;
      onUpdateConfig: (key: string, value: unknown) => void;
      disabled?: boolean;
    }>;

    // Code generation template (the actual template string, not a path)
    codegenTemplate: string;
  }>;
};

/**
 * Integration Registry
 * Auto-populated by plugin files
 */
const integrationRegistry = new Map<IntegrationType, IntegrationPlugin>();

/**
 * Register an integration plugin
 */
export function registerIntegration(plugin: IntegrationPlugin) {
  integrationRegistry.set(plugin.type, plugin);
}

/**
 * Get an integration plugin
 */
export function getIntegration(
  type: IntegrationType
): IntegrationPlugin | undefined {
  return integrationRegistry.get(type);
}

/**
 * Get all registered integrations
 */
export function getAllIntegrations(): IntegrationPlugin[] {
  return Array.from(integrationRegistry.values());
}

/**
 * Get all integration types
 */
export function getIntegrationTypes(): IntegrationType[] {
  return Array.from(integrationRegistry.keys());
}

/**
 * Get all actions across all integrations
 */
export function getAllActions() {
  const actions: Array<
    IntegrationPlugin["actions"][number] & { integration?: IntegrationType }
  > = [];

  for (const plugin of integrationRegistry.values()) {
    for (const action of plugin.actions) {
      actions.push({
        ...action,
        integration: plugin.type as IntegrationType,
      });
    }
  }

  return actions;
}

/**
 * Get actions by category
 */
export function getActionsByCategory() {
  const categories: Record<
    string,
    Array<
      IntegrationPlugin["actions"][number] & { integration?: IntegrationType }
    >
  > = {};

  for (const plugin of integrationRegistry.values()) {
    for (const action of plugin.actions) {
      if (!categories[action.category]) {
        categories[action.category] = [];
      }
      categories[action.category].push({
        ...action,
        integration: plugin.type as IntegrationType,
      });
    }
  }

  return categories;
}

/**
 * Find an action by ID
 */
export function findActionById(actionId: string) {
  for (const plugin of integrationRegistry.values()) {
    const action = plugin.actions.find((a) => a.id === actionId);
    if (action) {
      return {
        ...action,
        integration: plugin.type as IntegrationType,
      };
    }
  }
  return;
}

/**
 * Get integration labels map
 */
export function getIntegrationLabels(): Record<IntegrationType, string> {
  const labels: Record<string, string> = {};
  for (const plugin of integrationRegistry.values()) {
    labels[plugin.type] = plugin.label;
  }
  return labels as Record<IntegrationType, string>;
}

/**
 * Get sorted integration types for dropdowns
 */
export function getSortedIntegrationTypes(): IntegrationType[] {
  return Array.from(integrationRegistry.keys()).sort();
}
