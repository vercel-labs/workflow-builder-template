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
import { Shuffle } from 'lucide-react';
import type { WorkflowNodeData } from '@/lib/workflow-store';

export const TransformNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData;
  if (!nodeData) return null;

  const transformType = (nodeData.config?.transformType as string) || 'Map Data';
  const displayTitle = nodeData.label || transformType;
  const displayDescription = nodeData.description || 'Transform';
  const hasContent = !!transformType;

  return (
    <Node
      handles={{ target: true, source: true }}
      className={selected ? 'ring-primary rounded-md ring-2' : ''}
    >
      <NodeHeader className={!hasContent ? 'rounded-b-md border-b-0' : ''}>
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4" />
          <NodeTitle>{displayTitle}</NodeTitle>
        </div>
        {displayDescription && <NodeDescription>{displayDescription}</NodeDescription>}
      </NodeHeader>
      {hasContent && (
        <NodeContent>
          <div className="text-muted-foreground text-xs">{transformType}</div>
        </NodeContent>
      )}
    </Node>
  );
});

TransformNode.displayName = 'TransformNode';
