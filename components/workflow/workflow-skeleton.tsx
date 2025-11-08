"use client";

import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { GitBranch, PlayCircle, Zap } from "lucide-react";
import { useMemo } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Node, NodeContent, NodeHeader } from "@/components/ai-elements/node";
import { Skeleton } from "@/components/ui/skeleton";
import "@xyflow/react/dist/style.css";

type SkeletonNodeData = {
  data: {
    icon: typeof PlayCircle;
    hasTarget: boolean;
    hasContent?: boolean;
  };
};

// Skeleton Node Component
const SkeletonNode = ({ data }: SkeletonNodeData) => (
  <Node
    className="shadow-none"
    handles={{ target: data.hasTarget, source: true }}
  >
    <NodeHeader>
      <div className="flex items-center gap-2">
        <data.icon className="size-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-1 h-3 w-32" />
    </NodeHeader>
    {data.hasContent && (
      <NodeContent>
        <Skeleton className="h-3 w-full" />
      </NodeContent>
    )}
  </Node>
);

// Define skeleton nodes with realistic workflow layout
const skeletonNodes: ReactFlowNode[] = [
  {
    id: "skeleton-1",
    type: "skeleton",
    position: { x: 50, y: 150 },
    data: { icon: PlayCircle, hasTarget: false, hasContent: true },
  },
  {
    id: "skeleton-2",
    type: "skeleton",
    position: { x: 550, y: 50 },
    data: { icon: Zap, hasTarget: true, hasContent: false },
  },
  {
    id: "skeleton-3",
    type: "skeleton",
    position: { x: 1050, y: 150 },
    data: { icon: GitBranch, hasTarget: true, hasContent: true },
  },
];

// Define edges connecting the skeleton nodes
const skeletonEdges: ReactFlowEdge[] = [
  {
    id: "skeleton-edge-1",
    source: "skeleton-1",
    target: "skeleton-2",
    animated: true,
  },
  {
    id: "skeleton-edge-2",
    source: "skeleton-2",
    target: "skeleton-3",
    animated: true,
  },
];

const WorkflowSkeletonContent = () => {
  const nodeTypes = useMemo(
    () => ({
      skeleton: SkeletonNode,
    }),
    []
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/15 backdrop-blur-sm">
        <div className="text-center">
          <Skeleton className="mx-auto mb-2 h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
      <Canvas
        className="bg-background"
        edges={skeletonEdges}
        elementsSelectable={false}
        fitView
        nodes={skeletonNodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        panOnDrag={false}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
      />
    </div>
  );
};

export const WorkflowSkeleton = () => (
  <div className="flex h-screen w-full flex-col overflow-hidden">
    <ReactFlowProvider>
      <WorkflowSkeletonContent />
    </ReactFlowProvider>
  </div>
);
