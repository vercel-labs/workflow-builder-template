"use client";

import type { NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
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

type TransformNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const TransformNode = memo(({ data, selected }: TransformNodeProps) => {
  if (!data) {
    return null;
  }

  const transformType = (data.config?.transformType as string) || "Map Data";
  const displayTitle = data.label || transformType;
  const displayDescription = data.description || "Transform";
  const hasContent = !!transformType;

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
          <Shuffle className="size-4" />
          <NodeTitle>{displayTitle}</NodeTitle>
        </div>
        {displayDescription && (
          <NodeDescription>{displayDescription}</NodeDescription>
        )}
      </NodeHeader>
      {hasContent && (
        <NodeContent>
          <div className="text-muted-foreground text-xs">{transformType}</div>
        </NodeContent>
      )}
    </Node>
  );
});

TransformNode.displayName = "TransformNode";
