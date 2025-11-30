import type { IntegrationType } from "@/lib/types/integration";

/**
 * Action Definition
 * Describes a single action provided by a plugin
 */
export type PluginAction = {
  // Unique slug for this action (e.g., "send-email")
  // Full action ID will be computed as `{integration}/{slug}` (e.g., "resend/send-email")
  slug: string;

  // Human-readable label (e.g., "Send Email")
  label: string;

  // Description of what this action does
  description: string;

  // Category for grouping in UI
  category: string;

  // Icon component for this action
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

  // AI prompt template for this action (how to describe to the AI)
  // Use {key} placeholders for config fields
  aiPrompt: string;
};

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

  // Testing configuration (lazy-loaded to avoid bundling Node.js packages in client)
  testConfig?: {
    // Returns a promise that resolves to the test function
    // This allows the test module to be loaded only on the server when needed
    getTestFunction: () => Promise<
      (
        credentials: Record<string, string>
      ) => Promise<{ success: boolean; error?: string }>
    >;
  };

  // NPM dependencies required by this plugin (package name -> version)
  dependencies?: Record<string, string>;

  // Environment variables used by this plugin (for .env.example generation)
  envVars?: Array<{
    name: string;
    description: string;
  }>;

  // Actions provided by this integration
  actions: PluginAction[];
};

/**
 * Action with full ID
 * Includes the computed full action ID (integration/slug)
 */
export type ActionWithFullId = PluginAction & {
  id: string; // Full action ID: {integration}/{slug}
  integration: IntegrationType;
};

/**
 * Integration Registry
 * Auto-populated by plugin files
 */
const integrationRegistry = new Map<IntegrationType, IntegrationPlugin>();

/**
 * Compute full action ID from integration type and action slug
 */
export function computeActionId(
  integrationType: IntegrationType,
  actionSlug: string
): string {
  return `${integrationType}/${actionSlug}`;
}

/**
 * Parse a full action ID into integration type and action slug
 */
export function parseActionId(actionId: string): {
  integration: string;
  slug: string;
} | null {
  const parts = actionId.split("/");
  if (parts.length !== 2) {
    return null;
  }
  return { integration: parts[0], slug: parts[1] };
}

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
 * Get all actions across all integrations with full IDs
 */
export function getAllActions(): ActionWithFullId[] {
  const actions: ActionWithFullId[] = [];

  for (const plugin of integrationRegistry.values()) {
    for (const action of plugin.actions) {
      actions.push({
        ...action,
        id: computeActionId(plugin.type, action.slug),
        integration: plugin.type,
      });
    }
  }

  return actions;
}

/**
 * Get actions by category
 */
export function getActionsByCategory(): Record<string, ActionWithFullId[]> {
  const categories: Record<string, ActionWithFullId[]> = {};

  for (const plugin of integrationRegistry.values()) {
    for (const action of plugin.actions) {
      if (!categories[action.category]) {
        categories[action.category] = [];
      }
      categories[action.category].push({
        ...action,
        id: computeActionId(plugin.type, action.slug),
        integration: plugin.type,
      });
    }
  }

  return categories;
}

/**
 * Find an action by full ID (e.g., "resend/send-email")
 * Also supports legacy IDs (e.g., "Send Email") for backward compatibility
 */
export function findActionById(actionId: string): ActionWithFullId | undefined {
  // First try parsing as a namespaced ID
  const parsed = parseActionId(actionId);
  if (parsed) {
    const plugin = integrationRegistry.get(parsed.integration as IntegrationType);
    if (plugin) {
      const action = plugin.actions.find((a) => a.slug === parsed.slug);
      if (action) {
        return {
          ...action,
          id: actionId,
          integration: plugin.type,
        };
      }
    }
  }

  // Fall back to legacy label-based lookup for backward compatibility
  for (const plugin of integrationRegistry.values()) {
    const action = plugin.actions.find((a) => a.label === actionId);
    if (action) {
      return {
        ...action,
        id: computeActionId(plugin.type, action.slug),
        integration: plugin.type,
      };
    }
  }

  return undefined;
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

/**
 * Get all NPM dependencies across all integrations
 */
export function getAllDependencies(): Record<string, string> {
  const deps: Record<string, string> = {};

  for (const plugin of integrationRegistry.values()) {
    if (plugin.dependencies) {
      Object.assign(deps, plugin.dependencies);
    }
  }

  return deps;
}

/**
 * Get NPM dependencies for specific action IDs
 */
export function getDependenciesForActions(
  actionIds: string[]
): Record<string, string> {
  const deps: Record<string, string> = {};
  const integrations = new Set<IntegrationType>();

  // Find which integrations are used
  for (const actionId of actionIds) {
    const action = findActionById(actionId);
    if (action) {
      integrations.add(action.integration);
    }
  }

  // Get dependencies for those integrations
  for (const integrationType of integrations) {
    const plugin = integrationRegistry.get(integrationType);
    if (plugin?.dependencies) {
      Object.assign(deps, plugin.dependencies);
    }
  }

  return deps;
}

/**
 * Get all environment variables across all integrations
 */
export function getAllEnvVars(): Array<{ name: string; description: string }> {
  const envVars: Array<{ name: string; description: string }> = [];

  for (const plugin of integrationRegistry.values()) {
    if (plugin.envVars) {
      envVars.push(...plugin.envVars);
    }
  }

  return envVars;
}

/**
 * Generate AI prompt section for all available actions
 * This dynamically builds the action types documentation for the AI
 */
export function generateAIActionPrompts(): string {
  const lines: string[] = [];

  for (const plugin of integrationRegistry.values()) {
    for (const action of plugin.actions) {
      const fullId = computeActionId(plugin.type, action.slug);
      lines.push(`- ${action.label} (${fullId}): ${action.aiPrompt}`);
    }
  }

  return lines.join("\n");
}
