"use client";

import {
  ConnectionMode,
  MiniMap,
  type OnConnect,
  useReactFlow,
  type Viewport,
  type Connection as XYFlowConnection,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import "@xyflow/react/dist/style.css";

import { GitBranch, Loader2, PlayCircle, Shuffle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import {
  addNodeAtom,
  currentWorkflowIdAtom,
  edgesAtom,
  isGeneratingAtom,
  nodesAtom,
  onEdgesChangeAtom,
  onNodesChangeAtom,
  selectedNodeAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store";
import { Edge } from "../ai-elements/edge";
import { ActionNode } from "./nodes/action-node";
import { ConditionNode } from "./nodes/condition-node";
import { TransformNode } from "./nodes/transform-node";
import { TriggerNode } from "./nodes/trigger-node";

const nodeTemplates = [
  {
    type: "trigger" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Trigger",
    icon: PlayCircle,
    defaultConfig: { triggerType: "Manual" },
  },
  {
    type: "action" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Action",
    icon: Zap,
    defaultConfig: { actionType: "HTTP Request" },
  },
  {
    type: "condition" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Condition",
    icon: GitBranch,
    defaultConfig: { condition: "If true" },
  },
  {
    type: "transform" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Transform",
    icon: Shuffle,
    defaultConfig: { transformType: "Map Data" },
  },
];

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};

export function WorkflowCanvas() {
  const [nodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const onNodesChange = useSetAtom(onNodesChangeAtom);
  const onEdgesChange = useSetAtom(onEdgesChangeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const addNode = useSetAtom(addNodeAtom);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    sourceHandle?: string | null;
  } | null>(null);
  const connectingNodeId = useRef<string | null>(null);
  const menuJustOpened = useRef(false);
  const [defaultViewport, setDefaultViewport] = useState<Viewport | undefined>(
    undefined
  );
  const [viewportReady, setViewportReady] = useState(false);
  const viewportInitialized = useRef(false);

  // Load saved viewport when workflow changes
  useEffect(() => {
    if (!currentWorkflowId) {
      setViewportReady(false);
      return;
    }

    setViewportReady(false);
    const saved = localStorage.getItem(
      `workflow-viewport-${currentWorkflowId}`
    );
    if (saved) {
      try {
        const viewport = JSON.parse(saved) as Viewport;
        setDefaultViewport(viewport);
        // Mark viewport as ready immediately to prevent flash
        setViewportReady(true);
        // Set viewport after a brief delay to ensure ReactFlow is ready
        setTimeout(() => {
          setViewport(viewport, { duration: 0 });
          viewportInitialized.current = true;
        }, 50);
      } catch (error) {
        console.error("Failed to load viewport:", error);
        setDefaultViewport(undefined);
        setViewportReady(true);
        viewportInitialized.current = true;
      }
    } else {
      setDefaultViewport(undefined);
      setViewportReady(true);
      // Allow saving viewport after fitView completes
      setTimeout(() => {
        viewportInitialized.current = true;
      }, 500);
    }
  }, [currentWorkflowId, setViewport]);

  // Save viewport changes
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!(currentWorkflowId && viewportInitialized.current)) return;
      localStorage.setItem(
        `workflow-viewport-${currentWorkflowId}`,
        JSON.stringify(viewport)
      );
    },
    [currentWorkflowId]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo<Record<string, React.ComponentType<any>>>(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      condition: ConditionNode,
      transform: TransformNode,
    }),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: XYFlowConnection) => {
      const newEdge = {
        id: nanoid(),
        ...connection,
        type: "animated",
      };
      setEdges([...edges, newEdge]);
    },
    [edges, setEdges]
  );

  const onNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_event: React.MouseEvent, node: any) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onConnectStart = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_event: any, { nodeId }: { nodeId: string | null }) => {
      connectingNodeId.current = nodeId;
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeId.current) {
        return;
      }

      const target = event.target as Element;

      // Check if we're not dropping on a node or handle
      const isNode = target.closest(".react-flow__node");
      const isHandle = target.closest(".react-flow__handle");

      if (!(isNode || isHandle)) {
        // Get mouse position relative to the viewport
        const clientX =
          "changedTouches" in event
            ? event.changedTouches[0].clientX
            : event.clientX;
        const clientY =
          "changedTouches" in event
            ? event.changedTouches[0].clientY
            : event.clientY;

        // Get the ReactFlow wrapper element to calculate offset
        const reactFlowBounds = (event.target as Element)
          .closest(".react-flow")
          ?.getBoundingClientRect();

        // Adjust position relative to the ReactFlow container
        const adjustedX = reactFlowBounds
          ? clientX - reactFlowBounds.left
          : clientX;
        const adjustedY = reactFlowBounds
          ? clientY - reactFlowBounds.top
          : clientY;

        menuJustOpened.current = true;
        setMenu({
          id: connectingNodeId.current,
          top: adjustedY,
          left: adjustedX,
        });

        // Reset the flag after a brief moment
        setTimeout(() => {
          menuJustOpened.current = false;
        }, 100);
      }

      // Reset the connecting node
      connectingNodeId.current = null;
    },
    [setMenu]
  );

  const onAddNodeFromMenu = useCallback(
    (template: (typeof nodeTemplates)[0]) => {
      if (!menu) return;

      // Get the position in the flow coordinate system
      const position = screenToFlowPosition({
        x: menu.left,
        y: menu.top,
      });

      const newNode: WorkflowNode = {
        id: nanoid(),
        type: template.type,
        position,
        data: {
          label: template.label,
          description: template.description,
          type: template.type,
          config: template.defaultConfig,
          status: "idle",
        },
      };

      addNode(newNode);

      // Create connection from the source node to the new node
      const newEdge = {
        id: nanoid(),
        source: menu.id,
        target: newNode.id,
        type: "animated",
      };
      setEdges([...edges, newEdge]);

      // Close the menu
      setMenu(null);
    },
    [menu, screenToFlowPosition, addNode, edges, setEdges]
  );

  const onPaneClick = useCallback(() => {
    // Don't close the menu if it was just opened from a connection
    if (menuJustOpened.current) {
      return;
    }

    setMenu(null);
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onSelectionChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ nodes }: { nodes: any[] }) => {
      if (nodes.length === 0) {
        setSelectedNode(null);
      } else if (nodes.length === 1) {
        setSelectedNode(nodes[0].id);
      }
    },
    [setSelectedNode]
  );

  return (
    <div className="relative h-full w-full">
      {isGenerating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <div className="font-semibold text-lg">Generating workflow...</div>
          </div>
        </div>
      )}
      {!viewportReady && (
        <div className="absolute inset-0 z-40 bg-secondary transition-opacity duration-100" />
      )}
      <Canvas
        className="bg-background"
        connectionLineComponent={Connection}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={defaultViewport}
        edges={edges}
        edgeTypes={edgeTypes}
        elementsSelectable={!isGenerating}
        fitView={!defaultViewport}
        nodes={nodes}
        nodesConnectable={!isGenerating}
        nodesDraggable={!isGenerating}
        nodeTypes={nodeTypes}
        onConnect={isGenerating ? undefined : onConnect}
        onConnectEnd={isGenerating ? undefined : onConnectEnd}
        onConnectStart={isGenerating ? undefined : onConnectStart}
        onEdgesChange={isGenerating ? undefined : onEdgesChange}
        onMoveEnd={onMoveEnd}
        onNodeClick={isGenerating ? undefined : onNodeClick}
        onNodesChange={isGenerating ? undefined : onNodesChange}
        onPaneClick={onPaneClick}
        onSelectionChange={isGenerating ? undefined : onSelectionChange}
      >
        <Controls />
        <MiniMap
          bgColor="var(--sidebar)"
          className="hidden md:flex"
          nodeStrokeColor="var(--border)"
        />
      </Canvas>

      {menu && (
        <div
          className="fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 min-w-32 animate-in overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out"
          style={{
            position: "absolute",
            top: menu.top,
            left: menu.left,
            zIndex: 50,
          }}
        >
          {nodeTemplates
            .filter((template) => template.type !== "trigger")
            .map((template, index, filteredArray) => {
              const Icon = template.icon;
              return (
                <div key={template.type}>
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => onAddNodeFromMenu(template)}
                  >
                    <Icon className="size-4" />
                    {template.displayLabel}
                  </div>
                  {index < filteredArray.length - 1 && (
                    <div className="-mx-1 my-1 h-px bg-muted" />
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
