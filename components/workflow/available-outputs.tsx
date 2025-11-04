'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { nodesAtom, edgesAtom, selectedNodeAtom } from '@/lib/workflow-store';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AvailableOutputsProps {
  onInsertTemplate?: (template: string) => void;
}

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
  if (node.data.type === 'action') {
    const actionType = node.data.config?.actionType as string | undefined;
    return actionType || 'HTTP Request';
  }

  if (node.data.type === 'trigger') {
    const triggerType = node.data.config?.triggerType as string | undefined;
    return triggerType || 'Manual';
  }

  if (node.data.type === 'condition') {
    return 'Condition';
  }

  if (node.data.type === 'transform') {
    return 'Transform';
  }

  return 'Node';
};

export function AvailableOutputs({ onInsertTemplate }: AvailableOutputsProps) {
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Find all nodes that come before the selected node
  const getUpstreamNodes = () => {
    if (!selectedNodeId) return [];

    const visited = new Set<string>();
    const upstream: string[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
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
    toast.success('Template copied to clipboard');
  };

  const insertTemplate = (template: string) => {
    if (onInsertTemplate) {
      onInsertTemplate(template);
    } else {
      copyTemplate(template);
    }
  };

  // Get common fields based on node action type
  const getCommonFields = (node: { data: { type: string; config?: Record<string, unknown> } }) => {
    const actionType = node.data.config?.actionType;

    if (actionType === 'Find Issues') {
      return [
        { field: 'issues', description: 'Array of issues found' },
        { field: 'count', description: 'Number of issues' },
      ];
    } else if (actionType === 'Send Email') {
      return [
        { field: 'id', description: 'Email ID' },
        { field: 'status', description: 'Send status' },
      ];
    } else if (actionType === 'Create Ticket') {
      return [
        { field: 'id', description: 'Ticket ID' },
        { field: 'url', description: 'Ticket URL' },
        { field: 'number', description: 'Ticket number' },
      ];
    } else if (actionType === 'HTTP Request') {
      return [
        { field: 'data', description: 'Response data' },
        { field: 'status', description: 'HTTP status code' },
      ];
    } else if (actionType === 'Generate Text') {
      return [
        { field: 'text', description: 'Generated text' },
        { field: 'model', description: 'Model used' },
      ];
    } else if (actionType === 'Generate Image') {
      return [
        { field: 'base64', description: 'Base64 image data' },
        { field: 'model', description: 'Model used' },
      ];
    } else if (node.data.type === 'trigger') {
      return [
        { field: 'triggered', description: 'Trigger status' },
        { field: 'timestamp', description: 'Trigger timestamp' },
        { field: 'input', description: 'Input data' },
      ];
    }

    return [{ field: 'data', description: 'Output data' }];
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Available Outputs</div>
      <div className="space-y-2">
        {upstreamNodes.map((node) => {
          const isExpanded = expandedNodes.has(node.id);
          const fields = getCommonFields(node);

          return (
            <div key={node.id} className="border-muted rounded-lg border">
              <div className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg p-2 transition-colors">
                <div
                  className="flex flex-1 cursor-pointer items-center gap-2"
                  onClick={() => toggleNode(node.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleNode(node.id);
                    }
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="text-sm font-medium">{getNodeDisplayName(node)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    insertTemplate(`{{$${node.id}}}`);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {isExpanded && (
                <div className="border-muted space-y-1 border-t px-2 pt-1 pb-2">
                  {fields.map((field) => (
                    <div
                      key={field.field}
                      className="hover:bg-muted/50 flex items-center justify-between rounded px-2 py-1.5 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-medium">{field.field}</div>
                        {field.description && (
                          <div className="text-muted-foreground text-xs">{field.description}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 px-2"
                        onClick={() => insertTemplate(`{{$${node.id}.${field.field}}}`)}
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
