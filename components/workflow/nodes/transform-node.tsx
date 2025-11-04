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
import type { WorkflowNodeData } from "@/lib/workflow-store";

export const TransformNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;

  const transformType =
    (nodeData.config?.transformType as string) || "Map Data";
  const displayTitle = nodeData.label || transformType;
  const displayDescription = nodeData.description || "Transform";
  const hasContent = !!transformType;

  return (
    <Node
      className={selected ? "rounded-md ring-2 ring-primary" : ""}
      handles={{ target: true, source: true }}
    >
      <NodeHeader className={hasContent ? "" : "rounded-b-md border-b-0"}>
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4" />
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
