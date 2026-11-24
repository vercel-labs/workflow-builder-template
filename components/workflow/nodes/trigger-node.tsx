"use client";

import type { NodeProps } from "@xyflow/react";
import { Check, Clock, Play, Webhook, XCircle } from "lucide-react";
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

  // Select icon based on trigger type
  let TriggerIcon = Play;
  if (triggerType === "Schedule") {
    TriggerIcon = Clock;
  } else if (triggerType === "Webhook") {
    TriggerIcon = Webhook;
  }

  return (
    <Node
      className={cn(
        "relative flex h-auto w-auto min-w-[200px] flex-col transition-all duration-150 ease-out",
        selected && "border-primary"
      )}
      handles={{ target: false, source: true }}
      status={status}
    >
      {/* Status indicator badge in top right */}
      {status && status !== "idle" && status !== "running" && (
        <div
          className={cn(
            "absolute top-2 right-2 z-10 rounded-full p-1",
            status === "success" && "bg-green-500/50",
            status === "error" && "bg-red-500/50"
          )}
        >
          {status === "success" && (
            <Check className="size-3.5 text-white" strokeWidth={2.5} />
          )}
          {status === "error" && (
            <XCircle className="size-3.5 text-white" strokeWidth={2.5} />
          )}
        </div>
      )}

      <div className="flex flex-row items-center gap-2.5 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
          <TriggerIcon className="size-5 text-blue-500" strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <NodeTitle className="font-semibold text-sm leading-tight">
            {displayTitle}
          </NodeTitle>
          {displayDescription && (
            <NodeDescription className="text-xs leading-tight">
              {displayDescription}
            </NodeDescription>
          )}
        </div>
      </div>
    </Node>
  );
});

TriggerNode.displayName = "TriggerNode";
