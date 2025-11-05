"use client";

import type { NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
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
    "Database Query": "System",
    "Generate Text": "AI Gateway",
    "Generate Image": "AI Gateway",
  };
  return integrationMap[actionType] || "System";
};

type ActionNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  if (!data) {
    return null;
  }

  const actionType = (data.config?.actionType as string) || "HTTP Request";
  const displayTitle = data.label || actionType;
  const displayDescription =
    data.description || getIntegrationFromActionType(actionType);

  // Only show URL for action types that actually use endpoints
  const shouldShowUrl =
    actionType === "HTTP Request" || actionType === "Database Query";
  const endpoint = data.config?.endpoint as string | undefined;
  const hasContent = shouldShowUrl && endpoint;

  return (
    <Node
      className={cn(
        "shadow-none",
        selected && "rounded-md ring-2 ring-primary"
      )}
      handles={{ target: true, source: true }}
    >
      <NodeHeader>
        <div className="flex items-center gap-2">
          <Zap className="size-4" />
          <NodeTitle>{displayTitle}</NodeTitle>
        </div>
        {displayDescription && (
          <NodeDescription>{displayDescription}</NodeDescription>
        )}
      </NodeHeader>
      {hasContent && (
        <NodeContent>
          <div className="truncate text-muted-foreground text-xs">
            URL: {endpoint}
          </div>
        </NodeContent>
      )}
    </Node>
  );
});

ActionNode.displayName = "ActionNode";
