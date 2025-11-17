"use client";

import { useAtom } from "jotai";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { edgesAtom, nodesAtom, selectedNodeAtom } from "@/lib/workflow-store";
import type { SchemaField } from "./config/schema-builder";

type AvailableOutputsProps = {
  onInsertTemplate?: (template: string) => void;
};

// Helper to get a display name for a node
const getNodeDisplayName = (node: {
  id: string;
  data: {
    label?: string;
    type: string;
    config?: Record<string, unknown>;
  };
}): string => {
  // If user has set a custom label, use it
  if (node.data.label) {
    return node.data.label;
  }

  // Otherwise, use type-specific defaults
  if (node.data.type === "action") {
    const actionType = node.data.config?.actionType as string | undefined;
    return actionType || "HTTP Request";
  }

  if (node.data.type === "trigger") {
    const triggerType = node.data.config?.triggerType as string | undefined;
    return triggerType || "Manual";
  }

  if (node.data.type === "condition") {
    return "Condition";
  }

  if (node.data.type === "transform") {
    return "Transform";
  }

  return "Node";
};

export function AvailableOutputs({ onInsertTemplate }: AvailableOutputsProps) {
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Find all nodes that come before the selected node
  const getUpstreamNodes = () => {
    if (!selectedNodeId) {
      return [];
    }

    const visited = new Set<string>();
    const upstream: string[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);

      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      for (const edge of incomingEdges) {
        upstream.push(edge.source);
        traverse(edge.source);
      }
    };

    traverse(selectedNodeId);

    return nodes.filter((node) => upstream.includes(node.id));
  };

  const upstreamNodes = getUpstreamNodes();

  if (upstreamNodes.length === 0) {
    return null;
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template);
    toast.success("Template copied to clipboard");
  };

  const insertTemplate = (template: string) => {
    if (onInsertTemplate) {
      onInsertTemplate(template);
    } else {
      copyTemplate(template);
    }
  };

  // Convert schema fields to field descriptions
  const schemaToFields = (
    schema: SchemaField[],
    prefix = ""
  ): Array<{ field: string; description: string }> => {
    const fields: Array<{ field: string; description: string }> = [];

    for (const schemaField of schema) {
      const fieldPath = prefix
        ? `${prefix}.${schemaField.name}`
        : schemaField.name;
      const typeLabel =
        schemaField.type === "array"
          ? `${schemaField.itemType}[]`
          : schemaField.type;
      const description = schemaField.description || `${typeLabel}`;

      fields.push({ field: fieldPath, description });

      // Add nested fields for objects
      if (
        schemaField.type === "object" &&
        schemaField.fields &&
        schemaField.fields.length > 0
      ) {
        fields.push(...schemaToFields(schemaField.fields, fieldPath));
      }

      // Add nested fields for array items that are objects
      if (
        schemaField.type === "array" &&
        schemaField.itemType === "object" &&
        schemaField.fields &&
        schemaField.fields.length > 0
      ) {
        const arrayItemPath = `${fieldPath}[0]`;
        fields.push(...schemaToFields(schemaField.fields, arrayItemPath));
      }
    }

    return fields;
  };

  // Get common fields based on node action type
  const getCommonFields = (node: {
    data: { type: string; config?: Record<string, unknown> };
  }) => {
    const actionType = node.data.config?.actionType;

    if (actionType === "Find Issues") {
      return [
        { field: "issues", description: "Array of issues found" },
        { field: "count", description: "Number of issues" },
      ];
    }
    if (actionType === "Send Email") {
      return [
        { field: "id", description: "Email ID" },
        { field: "status", description: "Send status" },
      ];
    }
    if (actionType === "Create Ticket") {
      return [
        { field: "id", description: "Ticket ID" },
        { field: "url", description: "Ticket URL" },
        { field: "number", description: "Ticket number" },
      ];
    }
    if (actionType === "HTTP Request") {
      return [
        { field: "data", description: "Response data" },
        { field: "status", description: "HTTP status code" },
      ];
    }
    if (actionType === "Generate Text") {
      const aiFormat = node.data.config?.aiFormat as string | undefined;
      const aiSchema = node.data.config?.aiSchema as string | undefined;

      // If format is object and schema is defined, show schema fields
      if (aiFormat === "object" && aiSchema) {
        try {
          const schema = JSON.parse(aiSchema) as SchemaField[];
          if (schema.length > 0) {
            return schemaToFields(schema);
          }
        } catch {
          // If schema parsing fails, fall through to default fields
        }
      }

      // Default fields for text format or when no schema
      return [
        { field: "text", description: "Generated text" },
        { field: "model", description: "Model used" },
      ];
    }
    if (actionType === "Generate Image") {
      return [
        { field: "base64", description: "Base64 image data" },
        { field: "model", description: "Model used" },
      ];
    }
    if (node.data.type === "trigger") {
      return [
        { field: "triggered", description: "Trigger status" },
        { field: "timestamp", description: "Trigger timestamp" },
        { field: "input", description: "Input data" },
      ];
    }

    return [{ field: "data", description: "Output data" }];
  };

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">Available Outputs</div>
      <div className="space-y-2">
        {upstreamNodes.map((node) => {
          const isExpanded = expandedNodes.has(node.id);
          const fields = getCommonFields(node);

          return (
            <div className="rounded-lg border border-muted" key={node.id}>
              <div className="flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50">
                <div
                  className="flex flex-1 cursor-pointer items-center gap-2"
                  onClick={() => toggleNode(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleNode(node.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="font-medium text-sm">
                    {getNodeDisplayName(node)}
                  </span>
                </div>
                <Button
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    insertTemplate(
                      `{{@${node.id}:${getNodeDisplayName(node)}}}`
                    );
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-1 border-muted border-t px-2 pt-1 pb-2">
                  {fields.map((field) => (
                    <div
                      className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-muted/50"
                      key={field.field}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-xs">{field.field}</div>
                        {field.description && (
                          <div className="text-muted-foreground text-xs">
                            {field.description}
                          </div>
                        )}
                      </div>
                      <Button
                        className="ml-2 h-6 px-2"
                        onClick={() =>
                          insertTemplate(
                            `{{@${node.id}:${getNodeDisplayName(node)}.${field.field}}}`
                          )
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
