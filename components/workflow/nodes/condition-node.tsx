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
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/lib/workflow-store";

type ConditionNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const ConditionNode = memo(({ data, selected }: ConditionNodeProps) => {
  if (!data) {
    return null;
  }

  const condition = (data.config?.condition as string) || "If true";
  const displayTitle = data.label || condition;
  const displayDescription = data.description || "Condition";
  const hasContent = !!condition;

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
          <GitBranch className="size-4" />
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
