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

// Helper to parse template variables and render them as badges
const parseTemplateContent = (text: string) => {
  if (!text) {
    return null;
  }

  // Match template patterns: {{@nodeId:DisplayName.field}} or {{@nodeId:DisplayName}}
  const pattern = /\{\{@([^:]+):([^}]+)\}\}/g;
  const parts: Array<{ type: "text" | "badge"; content: string; id: string }> =
    [];
  let lastIndex = 0;
  let matchResult = pattern.exec(text);

  while (matchResult !== null) {
    const [, , displayPart] = matchResult;
    const matchStart = matchResult.index;

    // Add text before the template
    if (matchStart > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, matchStart),
        id: `text-${lastIndex}-${matchStart}`,
      });
    }

    // Add badge for template
    parts.push({
      type: "badge",
      content: displayPart,
      id: `badge-${displayPart}-${matchStart}`,
    });

    lastIndex = pattern.lastIndex;
    matchResult = pattern.exec(text);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
      id: `text-${lastIndex}-end`,
    });
  }

  // If no templates found, return plain text
  if (parts.length === 0) {
    return (
      <span className="truncate text-muted-foreground text-xs">{text}</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-muted-foreground text-xs">
      {parts.map((part) => {
        if (part.type === "badge") {
          return (
            <span
              className="inline-flex items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-blue-600 text-xs dark:text-blue-400"
              key={part.id}
            >
              {part.content}
            </span>
          );
        }
        return (
          <span className="truncate" key={part.id}>
            {part.content}
          </span>
        );
      })}
    </div>
  );
};

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
        selected &&
          "rounded-md ring ring-primary/50 transition-all duration-150 ease-out"
      )}
      handles={{ target: true, source: true }}
    >
      <NodeHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-pink-500/25">
            <GitBranch className="size-4.5 text-pink-400" />
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
        <NodeContent>{parseTemplateContent(condition)}</NodeContent>
      )}
    </Node>
  );
});

ConditionNode.displayName = "ConditionNode";
