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
import { GitBranch } from 'lucide-react';
import type { WorkflowNodeData } from '@/lib/workflow-store';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;
  return (
    <Node
      handles={{ target: true, source: true }}
      className={selected ? 'ring-primary rounded-md ring-2' : ''}
    >
      <NodeHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <NodeTitle>{nodeData.label}</NodeTitle>
        </div>
        {nodeData.description && <NodeDescription>{nodeData.description}</NodeDescription>}
      </NodeHeader>
      <NodeContent>
        <div className="text-muted-foreground text-xs">
          Condition: {(nodeData.config?.condition as string) || 'If true'}
        </div>
      </NodeContent>
    </Node>
  );
});

ConditionNode.displayName = 'ConditionNode';
