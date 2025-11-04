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
import type { WorkflowNodeData } from "@/lib/workflow-store";

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;

  const triggerType = (nodeData.config?.triggerType as string) || "Manual";
  const displayTitle = nodeData.label || triggerType;
  const displayDescription = nodeData.description || "Trigger";
  const hasContent = !!triggerType;

  return (
    <Node
      className={selected ? "rounded-md ring-2 ring-primary" : ""}
      handles={{ target: false, source: true }}
    >
      <NodeHeader className={hasContent ? "" : "rounded-b-md border-b-0"}>
        <div className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4" />
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
