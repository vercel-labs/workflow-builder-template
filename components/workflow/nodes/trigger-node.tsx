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
        selected &&
          "rounded-md ring ring-primary/50 transition-all duration-150 ease-out"
      )}
      handles={{ target: false, source: true }}
    >
      <NodeHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-blue-600/50">
            <PlayCircle className="size-4 text-blue-200" />
          </span>
          <div className="flex flex-col gap-0.5">
            <NodeTitle>{displayTitle}</NodeTitle>
            {displayDescription && (
              <NodeDescription>{displayDescription}</NodeDescription>
            )}
          </div>
        </div>
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
