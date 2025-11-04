"use client";

import type { NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import type { WorkflowNodeData } from "@/lib/workflow-store";

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;

  const condition = (nodeData.config?.condition as string) || "If true";
  const displayTitle = nodeData.label || condition;
  const displayDescription = nodeData.description || "Condition";
  const hasContent = !!condition;

  return (
    <Node
      className={selected ? "rounded-md ring-2 ring-primary" : ""}
      handles={{ target: true, source: true }}
    >
      <NodeHeader className={hasContent ? "" : "rounded-b-md border-b-0"}>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <NodeTitle>{displayTitle}</NodeTitle>
        </div>
        {displayDescription && (
          <NodeDescription>{displayDescription}</NodeDescription>
        )}
      </NodeHeader>
      {hasContent && (
        <NodeContent>
          <div className="text-muted-foreground text-xs">{condition}</div>
        </NodeContent>
      )}
    </Node>
  );
});

ConditionNode.displayName = "ConditionNode";
