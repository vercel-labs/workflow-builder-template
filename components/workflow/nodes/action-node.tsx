"use client";

import type { NodeProps } from "@xyflow/react";
import { useAtomValue } from "jotai";
import {
  AlertTriangle,
  Check,
  Code,
  Database,
  GitBranch,
  Loader2,
  XCircle,
  Zap,
} from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeDescription,
  NodeTitle,
} from "@/components/ai-elements/node";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { projectIntegrationsAtom } from "@/lib/integrations-store";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow-store";

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
const isIntegrationConfigured = (
  actionType: string,
  integrations: ReturnType<
    typeof useAtomValue<typeof projectIntegrationsAtom>
  > | null
): boolean => {
  if (!integrations) {
    return false;
  }

  switch (actionType) {
    case "Send Email":
      return integrations.hasResendKey;
    case "Send Slack Message":
      return integrations.hasSlackKey;
    case "Create Ticket":
    case "Find Issues":
      return integrations.hasLinearKey;
    case "Generate Text":
    case "Generate Image":
      return integrations.hasAiGatewayKey;
    case "Database Query":
      return integrations.hasDatabaseUrl;
    default:
      return true;
  }
};

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
  if (!status || status === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-2 right-2 rounded-full p-1",
        status === "running" && "bg-blue-500/50",
        status === "success" && "bg-green-500/50",
        status === "error" && "bg-red-500/50"
      )}
    >
      {status === "running" && (
        <Loader2
          className="size-3.5 animate-spin text-white"
          strokeWidth={2.5}
        />
      )}
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
};

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  const integrations = useAtomValue(projectIntegrationsAtom);

  if (!data) {
    return null;
  }

  const actionType = (data.config?.actionType as string) || "";
  const status = data.status;

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
    needsIntegration && !isIntegrationConfigured(actionType, integrations);

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
        {getProviderLogo(actionType)}
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
