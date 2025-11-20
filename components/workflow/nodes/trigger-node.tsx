"use client";

import type { NodeProps } from "@xyflow/react";
import { Check, Loader2, PlayCircle, XCircle } from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeDescription,
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
  const status = data.status;

  return (
    <Node
      className={cn(
        "flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out",
        selected && "border-primary"
      )}
      handles={{ target: false, source: true }}
      status={status}
    >
      {/* Status indicator badge in top right */}
      {status && status !== "idle" && (
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
      )}

      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <PlayCircle className="size-12 text-blue-500" strokeWidth={1.5} />
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

TriggerNode.displayName = "TriggerNode";
