"use client";

import type { NodeProps } from "@xyflow/react";
import { PlayCircle } from "lucide-react";
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

type TriggerNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const TriggerNode = memo(({ data, selected }: TriggerNodeProps) => {
  if (!data) {
    return null;
  }

  const triggerType = (data.config?.triggerType as string) || "Manual";
  const displayTitle = data.label || triggerType;
  const displayDescription = data.description || "Trigger";
  const hasContent = !!triggerType;

  return (
    <Node
      className={cn(
        "shadow-none",
        selected && "rounded-md ring-2 ring-primary"
      )}
      handles={{ target: false, source: true }}
    >
      <NodeHeader>
        <div className="flex items-center gap-2">
          <PlayCircle className="size-4" />
          <NodeTitle>{displayTitle}</NodeTitle>
        </div>
        {displayDescription && (
          <NodeDescription>{displayDescription}</NodeDescription>
        )}
      </NodeHeader>
      {hasContent && (
        <NodeContent>
          <div className="text-muted-foreground text-xs">{triggerType}</div>
        </NodeContent>
      )}
    </Node>
  );
});

TriggerNode.displayName = "TriggerNode";
