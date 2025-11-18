"use client";

import type { NodeProps } from "@xyflow/react";
import { Code, Database, Zap } from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { IntegrationIcon } from "@/components/ui/integration-icon";
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

// Helper to get integration name from action type
const getIntegrationFromActionType = (actionType: string): string => {
  const integrationMap: Record<string, string> = {
    "Send Email": "Resend",
    "Send Slack Message": "Slack",
    "Create Ticket": "Linear",
    "Find Issues": "Linear",
    "HTTP Request": "System",
    "Database Query": "System",
    "Generate Text": "AI Gateway",
    "Generate Image": "AI Gateway",
  };
  return integrationMap[actionType] || "System";
};

// Helper to get provider logo for action type
const getProviderLogo = (actionType: string) => {
  switch (actionType) {
    case "Send Email":
      return <IntegrationIcon className="size-5" integration="resend" />;
    case "Send Slack Message":
      return <IntegrationIcon className="size-5" integration="slack" />;
    case "Create Ticket":
    case "Find Issues":
      return <IntegrationIcon className="size-5" integration="linear" />;
    case "HTTP Request":
      return <Zap className="size-5 text-amber-300" />;
    case "Database Query":
      return <Database className="size-5 text-blue-300" />;
    case "Generate Text":
    case "Generate Image":
      return <IntegrationIcon className="size-5" integration="vercel" />;
    case "Execute Code":
      return <Code className="size-5 text-green-300" />;
    default:
      return <Zap className="size-5 text-amber-300" />;
  }
};

type ActionNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  if (!data) {
    return null;
  }

  const actionType = (data.config?.actionType as string) || "HTTP Request";
  const displayTitle = data.label || actionType;
  const displayDescription =
    data.description || getIntegrationFromActionType(actionType);

  // Helper functions to get content based on action type
  const getHttpRequestContent = (config: Record<string, unknown>) =>
    config.endpoint ? `URL: ${config.endpoint}` : null;

  const getDatabaseQueryContent = (config: Record<string, unknown>) =>
    config.dbQuery ? `Query: ${config.dbQuery}` : null;

  const getEmailContent = (config: Record<string, unknown>) =>
    config.emailTo ? `To: ${config.emailTo}` : null;

  const getSlackContent = (config: Record<string, unknown>) =>
    config.slackChannel ? `Channel: ${config.slackChannel}` : null;

  const getTicketContent = (config: Record<string, unknown>) =>
    config.ticketTitle ? `Title: ${config.ticketTitle}` : null;

  const getIssuesContent = (config: Record<string, unknown>) =>
    config.linearAssigneeId ? `Assignee: ${config.linearAssigneeId}` : null;

  const getAiGenerationContent = (config: Record<string, unknown>) => {
    if (config.aiPrompt) {
      return `Prompt: ${config.aiPrompt}`;
    }
    if (config.imagePrompt) {
      return `Prompt: ${config.imagePrompt}`;
    }
    return null;
  };

  const getCodeContent = (config: Record<string, unknown>) =>
    config.code ? `Code: ${config.code}` : null;

  // Determine what content to show based on action type
  const getContentField = () => {
    const config = data.config || {};

    switch (actionType) {
      case "HTTP Request":
        return getHttpRequestContent(config);
      case "Database Query":
        return getDatabaseQueryContent(config);
      case "Send Email":
        return getEmailContent(config);
      case "Send Slack Message":
        return getSlackContent(config);
      case "Create Ticket":
        return getTicketContent(config);
      case "Find Issues":
        return getIssuesContent(config);
      case "Generate Text":
      case "Generate Image":
        return getAiGenerationContent(config);
      case "Execute Code":
        return getCodeContent(config);
      default:
        return null;
    }
  };

  const contentField = getContentField();
  const hasContent = !!contentField;

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
          <span className="flex size-9 items-center justify-center rounded-md bg-muted">
            {getProviderLogo(actionType)}
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
        <NodeContent>{parseTemplateContent(contentField)}</NodeContent>
      )}
    </Node>
  );
});

ActionNode.displayName = "ActionNode";
