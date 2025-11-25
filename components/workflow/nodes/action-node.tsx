"use client";

import type { NodeProps } from "@xyflow/react";
import { useAtomValue } from "jotai";
import {
  AlertTriangle,
  Check,
  Code,
  Database,
  GitBranch,
  XCircle,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import {
  Node,
  NodeDescription,
  NodeTitle,
} from "@/components/ai-elements/node";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { cn } from "@/lib/utils";
import {
  executionLogsAtom,
  selectedExecutionIdAtom,
  type WorkflowNodeData,
} from "@/lib/workflow-store";

// Helper to get integration name from action type
const getIntegrationFromActionType = (actionType: string): string => {
  const integrationMap: Record<string, string> = {
    "Send Email": "Resend",
    "Send Slack Message": "Slack",
    "Create Ticket": "Linear",
    "Find Issues": "Linear",
    "HTTP Request": "System",
    "Database Query": "Database",
    "Generate Text": "AI Gateway",
    "Generate Image": "AI Gateway",
    Condition: "Condition",
  };
  return integrationMap[actionType] || "System";
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
  const requiresIntegrationActions = [
    "Send Email",
    "Send Slack Message",
    "Create Ticket",
    "Find Issues",
    "Generate Text",
    "Generate Image",
    "Database Query",
  ];
  return requiresIntegrationActions.includes(actionType);
};

// Helper to check if integration is configured
// Now checks for integrationId in node config
const hasIntegrationConfigured = (config: Record<string, unknown>): boolean =>
  Boolean(config?.integrationId);

// Helper to get provider logo for action type
const getProviderLogo = (actionType: string) => {
  switch (actionType) {
    case "Send Email":
      return <IntegrationIcon className="size-12" integration="resend" />;
    case "Send Slack Message":
      return <IntegrationIcon className="size-12" integration="slack" />;
    case "Create Ticket":
    case "Find Issues":
      return <IntegrationIcon className="size-12" integration="linear" />;
    case "HTTP Request":
      return <Zap className="size-12 text-amber-300" strokeWidth={1.5} />;
    case "Database Query":
      return <Database className="size-12 text-blue-300" strokeWidth={1.5} />;
    case "Generate Text":
    case "Generate Image":
      return <IntegrationIcon className="size-12" integration="vercel" />;
    case "Execute Code":
      return <Code className="size-12 text-green-300" strokeWidth={1.5} />;
    case "Condition":
      return <GitBranch className="size-12 text-pink-300" strokeWidth={1.5} />;
    default:
      return <Zap className="size-12 text-amber-300" strokeWidth={1.5} />;
  }
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

type ActionNodeProps = NodeProps & {
  data?: WorkflowNodeData;
  id: string;
};

export const ActionNode = memo(({ data, selected, id }: ActionNodeProps) => {
  const selectedExecutionId = useAtomValue(selectedExecutionIdAtom);
  const executionLogs = useAtomValue(executionLogsAtom);

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
    return (
      <Node
        className={cn(
          "flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out",
          selected && "border-primary"
        )}
        handles={{ target: true, source: true }}
        status={status}
      >
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

  const displayTitle = data.label || actionType;
  const displayDescription =
    data.description || getIntegrationFromActionType(actionType);

  const needsIntegration = requiresIntegration(actionType);
  const integrationMissing =
    needsIntegration && !hasIntegrationConfigured(data.config || {});

  return (
    <Node
      className={cn(
        "relative flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out",
        selected && "border-primary"
      )}
      handles={{ target: true, source: true }}
      status={status}
    >
      {/* Integration warning badge in top left */}
      {integrationMissing && (
        <div className="absolute top-2 left-2 rounded-full bg-orange-500/50 p-1">
          <AlertTriangle className="size-3.5 text-white" />
        </div>
      )}

      {/* Status indicator badge in top right */}
      <StatusBadge status={status} />

      <div className="flex flex-col items-center justify-center gap-3 p-6">
        {hasGeneratedImage ? (
          <div className="relative size-12 overflow-hidden rounded-lg">
            <Image
              alt="Generated image"
              className="object-cover"
              fill
              sizes="48px"
              src={`data:image/png;base64,${(nodeLog.output as { base64: string }).base64}`}
              unoptimized
            />
          </div>
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
        </div>
      </div>
    </Node>
  );
});

ActionNode.displayName = "ActionNode";
