'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import {
  Node,
  NodeHeader,
  NodeTitle,
  NodeDescription,
  NodeContent,
} from '@/components/ai-elements/node';
import { Zap } from 'lucide-react';
import type { WorkflowNodeData } from '@/lib/workflow-store';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;
  return (
    <Node
      handles={{ target: true, source: true }}
      className={selected ? 'ring-primary rounded-md ring-2' : ''}
    >
      <NodeHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <NodeTitle>{nodeData.label}</NodeTitle>
        </div>
        {nodeData.description && <NodeDescription>{nodeData.description}</NodeDescription>}
      </NodeHeader>
      <NodeContent>
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            Action: {(nodeData.config?.actionType as string) || 'HTTP Request'}
          </div>
          {(nodeData.config?.endpoint as string | undefined) && (
            <div className="text-muted-foreground truncate text-xs">
              URL: {nodeData.config?.endpoint as string}
            </div>
          )}
        </div>
      </NodeContent>
    </Node>
  );
});

ActionNode.displayName = 'ActionNode';
