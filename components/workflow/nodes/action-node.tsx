"use client";

import type { NodeProps } from "@xyflow/react";
import { useAtomValue } from "jotai";
import {
  AlertTriangle,
  Check,
  Code,
  Database,
  EyeOff,
  GitBranch,
  XCircle,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { memo, useState } from "react";
import {
  Node,
  NodeDescription,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  integrationIdsAtom,
  integrationsLoadedAtom,
} from "@/lib/integrations-store";
import { cn } from "@/lib/utils";
import {
  executionLogsAtom,
  pendingIntegrationNodesAtom,
  selectedExecutionIdAtom,
  type WorkflowNodeData,
} from "@/lib/workflow-store";
import { findActionById, getIntegration } from "@/plugins";

// Helper to get display name for AI model
const getModelDisplayName = (modelId: string): string => {
  const modelNames: Record<string, string> = {
    "gpt-5": "GPT-5",
    "openai/gpt-5.1-instant": "GPT-5.1 Instant",
    "openai/gpt-5.1-codex": "GPT-5.1 Codex",
    "openai/gpt-5.1-codex-mini": "GPT-5.1 Codex Mini",
    "openai/gpt-5.1-thinking": "GPT-5.1 Thinking",
    "gpt-4": "GPT-4",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "claude-3-5-sonnet": "Claude 3.5",
    "claude-3-opus": "Claude 3 Opus",
    "anthropic/claude-opus-4.5": "Claude Opus 4.5",
    "anthropic/claude-sonnet-4.5": "Claude Sonnet 4.5",
    "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
    "google/gemini-3-pro-preview": "Gemini 3 Pro Preview",
    "google/gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
    "google/gemini-2.5-flash": "Gemini 2.5 Flash",
    "google/gemini-2.5-pro": "Gemini 2.5 Pro",
    "meta/llama-4-scout": "Llama 4 Scout",
    "meta/llama-3.3-70b": "Llama 3.3 70B",
    "meta/llama-3.1-8b": "Llama 3.1 8B",
    "moonshotai/kimi-k2-0905": "Kimi K2",
    "openai/gpt-oss-120b": "GPT OSS 120B",
    "openai/gpt-oss-safeguard-20b": "GPT OSS Safeguard 20B",
    "openai/gpt-oss-20b": "GPT OSS 20B",
    "o1-preview": "o1 Preview",
    "o1-mini": "o1 Mini",
    "bfl/flux-2-pro": "FLUX.2 Pro",
    "bfl/flux-1-pro": "FLUX.1 Pro",
    "openai/dall-e-3": "DALL-E 3",
    "google/imagen-4.0-generate": "Imagen 4.0",
  };
  return modelNames[modelId] || modelId;
};

// System action labels (non-plugin actions)
const SYSTEM_ACTION_LABELS: Record<string, string> = {
  "HTTP Request": "System",
  "Database Query": "Database",
  Condition: "Condition",
  "Execute Code": "System",
};

// Helper to get integration name from action type
const getIntegrationFromActionType = (actionType: string): string => {
  // Check if it's a system action first
  if (SYSTEM_ACTION_LABELS[actionType]) {
    return SYSTEM_ACTION_LABELS[actionType];
  }

  // Look up in plugin registry
  const action = findActionById(actionType);
  if (action?.integration) {
    const plugin = getIntegration(action.integration);
    return plugin?.label || "System";
  }

  return "System";
};

// Helper to detect if output is a base64 image from generateImage step
function isBase64ImageOutput(output: unknown): output is { base64: string } {
  return (
    typeof output === "object" &&
    output !== null &&
    "base64" in output &&
    typeof (output as { base64: unknown }).base64 === "string" &&
    (output as { base64: string }).base64.length > 100
  );
}

// Helper to check if an action requires an integration
const requiresIntegration = (actionType: string): boolean => {
  // System actions that require integration configuration
  const systemActionsRequiringIntegration = ["Database Query"];
  if (systemActionsRequiringIntegration.includes(actionType)) {
    return true;
  }

  // Plugin actions always require integration
  const action = findActionById(actionType);
  return action !== undefined;
};

// Helper to get provider logo for action type
const getProviderLogo = (actionType: string) => {
  // Check for system actions first (non-plugin)
  switch (actionType) {
    case "HTTP Request":
      return <Zap className="size-12 text-amber-300" strokeWidth={1.5} />;
    case "Database Query":
      return <Database className="size-12 text-blue-300" strokeWidth={1.5} />;
    case "Execute Code":
      return <Code className="size-12 text-green-300" strokeWidth={1.5} />;
    case "Condition":
      return <GitBranch className="size-12 text-pink-300" strokeWidth={1.5} />;
    default:
      // Not a system action, continue to check plugin registry
      break;
  }

  // Look up action in plugin registry and get the integration icon
  const action = findActionById(actionType);
  if (action) {
    const plugin = getIntegration(action.integration);
    if (plugin?.icon) {
      const PluginIcon = plugin.icon;
      return <PluginIcon className="size-12" />;
    }
  }

  // Fallback for unknown actions
  return <Zap className="size-12 text-amber-300" strokeWidth={1.5} />;
};

// Status badge component
const StatusBadge = ({
  status,
}: {
  status?: "idle" | "running" | "success" | "error";
}) => {
  // Don't show badge for idle or running (running has BorderBeam animation)
  if (!status || status === "idle" || status === "running") {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-2 right-2 rounded-full p-1",
        status === "success" && "bg-green-500/50",
        status === "error" && "bg-red-500/50"
      )}
    >
      {status === "success" && (
        <Check className="size-3.5 text-white" strokeWidth={2.5} />
      )}
      {status === "error" && (
        <XCircle className="size-3.5 text-white" strokeWidth={2.5} />
      )}
    </div>
  );
};

// Model badge component for AI nodes
const ModelBadge = ({ model }: { model: string }) => {
  if (!model) {
    return null;
  }

  return (
    <div className="rounded-full border border-muted-foreground/50 px-2 py-0.5 font-medium text-[10px] text-muted-foreground">
      {getModelDisplayName(model)}
    </div>
  );
};

// Generated image thumbnail with zoom dialog
function GeneratedImageThumbnail({ base64 }: { base64: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button
        className="relative size-12 cursor-zoom-in overflow-hidden rounded-lg transition-transform hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          setDialogOpen(true);
        }}
        type="button"
      >
        <Image
          alt="Generated image"
          className="object-cover"
          fill
          sizes="48px"
          src={`data:image/png;base64,${base64}`}
          unoptimized
        />
      </button>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="max-w-3xl p-2" showCloseButton={false}>
          <DialogTitle className="sr-only">Generated Image</DialogTitle>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <Image
              alt="Generated image"
              className="object-contain"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              src={`data:image/png;base64,${base64}`}
              unoptimized
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ActionNodeProps = NodeProps & {
  data?: WorkflowNodeData;
  id: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI logic with multiple conditions including disabled state
export const ActionNode = memo(({ data, selected, id }: ActionNodeProps) => {
  const selectedExecutionId = useAtomValue(selectedExecutionIdAtom);
  const executionLogs = useAtomValue(executionLogsAtom);
  const pendingIntegrationNodes = useAtomValue(pendingIntegrationNodesAtom);
  const availableIntegrationIds = useAtomValue(integrationIdsAtom);
  const integrationsLoaded = useAtomValue(integrationsLoadedAtom);

  if (!data) {
    return null;
  }

  const actionType = (data.config?.actionType as string) || "";
  const status = data.status;

  // Check if this node has a generated image from the selected execution
  const nodeLog = executionLogs[id];
  const hasGeneratedImage =
    selectedExecutionId &&
    actionType === "Generate Image" &&
    nodeLog?.output &&
    isBase64ImageOutput(nodeLog.output);

  // Handle empty action type (new node without selected action)
  if (!actionType) {
    const isDisabled = data.enabled === false;
    return (
      <Node
        className={cn(
          "flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out",
          selected && "border-primary",
          isDisabled && "opacity-50"
        )}
        data-testid={`action-node-${id}`}
        handles={{ target: true, source: true }}
        status={status}
      >
        {isDisabled && (
          <div className="absolute top-2 left-2 rounded-full bg-gray-500/50 p-1">
            <EyeOff className="size-3.5 text-white" />
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-3 p-6">
          <Zap className="size-12 text-muted-foreground" strokeWidth={1.5} />
          <div className="flex flex-col items-center gap-1 text-center">
            <NodeTitle className="text-base">
              {data.label || "Action"}
            </NodeTitle>
            <NodeDescription className="text-xs">
              Select an action
            </NodeDescription>
          </div>
        </div>
      </Node>
    );
  }

  // Get human-readable label from registry if no custom label is set
  const actionInfo = findActionById(actionType);
  const displayTitle = data.label || actionInfo?.label || actionType;
  const displayDescription =
    data.description || getIntegrationFromActionType(actionType);

  const needsIntegration = requiresIntegration(actionType);
  // Don't show missing indicator if we're still checking for auto-select
  const isPendingIntegrationCheck = pendingIntegrationNodes.has(id);
  // Check both that integrationId is set AND that it exists in available integrations
  const configuredIntegrationId = data.config?.integrationId as
    | string
    | undefined;
  const hasValidIntegration =
    configuredIntegrationId &&
    availableIntegrationIds.has(configuredIntegrationId);
  // Only show missing indicator after integrations have been loaded
  const integrationMissing =
    integrationsLoaded &&
    needsIntegration &&
    !hasValidIntegration &&
    !isPendingIntegrationCheck;

  // Get model for AI nodes
  const getAiModel = (): string | null => {
    if (actionType === "Generate Text") {
      return (data.config?.aiModel as string) || "meta/llama-4-scout";
    }
    if (actionType === "Generate Image") {
      return (
        (data.config?.imageModel as string) || "google/imagen-4.0-generate"
      );
    }
    return null;
  };

  const aiModel = getAiModel();
  const isDisabled = data.enabled === false;

  return (
    <Node
      className={cn(
        "relative flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out",
        selected && "border-primary",
        isDisabled && "opacity-50"
      )}
      data-testid={`action-node-${id}`}
      handles={{ target: true, source: true }}
      status={status}
    >
      {/* Disabled badge in top left */}
      {isDisabled && (
        <div className="absolute top-2 left-2 rounded-full bg-gray-500/50 p-1">
          <EyeOff className="size-3.5 text-white" />
        </div>
      )}

      {/* Integration warning badge in top left (only if not disabled) */}
      {!isDisabled && integrationMissing && (
        <div className="absolute top-2 left-2 rounded-full bg-orange-500/50 p-1">
          <AlertTriangle className="size-3.5 text-white" />
        </div>
      )}

      {/* Status indicator badge in top right */}
      <StatusBadge status={status} />

      <div className="flex flex-col items-center justify-center gap-3 p-6">
        {hasGeneratedImage ? (
          <GeneratedImageThumbnail
            base64={(nodeLog.output as { base64: string }).base64}
          />
        ) : (
          getProviderLogo(actionType)
        )}
        <div className="flex flex-col items-center gap-1 text-center">
          <NodeTitle className="text-base">{displayTitle}</NodeTitle>
          {displayDescription && (
            <NodeDescription className="text-xs">
              {displayDescription}
            </NodeDescription>
          )}
          {/* Model badge for AI nodes */}
          {aiModel && <ModelBadge model={aiModel} />}
        </div>
      </div>
    </Node>
  );
});

ActionNode.displayName = "ActionNode";
