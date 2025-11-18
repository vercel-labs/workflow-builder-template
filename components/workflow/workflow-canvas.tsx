"use client";

import {
  ConnectionMode,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
  type OnConnectStartParams,
  useReactFlow,
  type Viewport,
  type Connection as XYFlowConnection,
  type Edge as XYFlowEdge,
} from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import "@xyflow/react/dist/style.css";

import { Loader2, PlayCircle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import {
  addNodeAtom,
  currentWorkflowIdAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
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
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const connectingNodeId = useRef<string | null>(null);
  const [defaultViewport, setDefaultViewport] = useState<Viewport | undefined>(
    undefined
  );
  const [viewportReady, setViewportReady] = useState(false);
  const [shouldFitView, setShouldFitView] = useState(false);
  const viewportInitialized = useRef(false);

  // Load saved viewport when workflow changes
  useEffect(() => {
    if (!currentWorkflowId) {
      setViewportReady(true);
      setDefaultViewport(undefined);
      setShouldFitView(true); // Enable fitView for landing page to center the trigger node
      viewportInitialized.current = true;
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
        setShouldFitView(false);
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
        setShouldFitView(true);
        setViewportReady(true);
        viewportInitialized.current = true;
      }
    } else {
      setDefaultViewport(undefined);
      setShouldFitView(true);
      setViewportReady(true);
      // Allow saving viewport after fitView completes
      setTimeout(() => {
        viewportInitialized.current = true;
        setShouldFitView(false);
      }, 500);
    }
  }, [currentWorkflowId, setViewport]);

  // Save viewport changes
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!(currentWorkflowId && viewportInitialized.current)) {
        return;
      }
      localStorage.setItem(
        `workflow-viewport-${currentWorkflowId}`,
        JSON.stringify(viewport)
      );
    },
    [currentWorkflowId]
  );

  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
    }),
    []
  );

  const isValidConnection = useCallback(
    (connection: XYFlowConnection | XYFlowEdge) => {
      // Ensure we have both source and target
      if (!(connection.source && connection.target)) {
        return false;
      }

      // Prevent self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Ensure connection is from source handle to target handle
      // sourceHandle should be defined if connecting from a specific handle
      // targetHandle should be defined if connecting to a specific handle
      return true;
    },
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
      setHasUnsavedChanges(true);
    },
    [edges, setEdges, setHasUnsavedChanges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      connectingNodeId.current = params.nodeId;
    },
    []
  );

  const getClientPosition = useCallback((event: MouseEvent | TouchEvent) => {
    const clientX =
      "changedTouches" in event
        ? event.changedTouches[0].clientX
        : event.clientX;
    const clientY =
      "changedTouches" in event
        ? event.changedTouches[0].clientY
        : event.clientY;
    return { clientX, clientY };
  }, []);

  const calculateMenuPosition = useCallback(
    (event: MouseEvent | TouchEvent, clientX: number, clientY: number) => {
      const reactFlowBounds = (event.target as Element)
        .closest(".react-flow")
        ?.getBoundingClientRect();

      const adjustedX = reactFlowBounds
        ? clientX - reactFlowBounds.left
        : clientX;
      const adjustedY = reactFlowBounds
        ? clientY - reactFlowBounds.top
        : clientY;

      return { adjustedX, adjustedY };
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeId.current) {
        return;
      }

      const target = event.target as Element;
      const isNode = target.closest(".react-flow__node");
      const isHandle = target.closest(".react-flow__handle");

      if (!(isNode || isHandle)) {
        const { clientX, clientY } = getClientPosition(event);
        const { adjustedX, adjustedY } = calculateMenuPosition(
          event,
          clientX,
          clientY
        );

        // Get the action template
        const actionTemplate = nodeTemplates.find((t) => t.type === "action");
        if (!actionTemplate) {
          return;
        }

        // Get the position in the flow coordinate system
        const position = screenToFlowPosition({
          x: adjustedX,
          y: adjustedY,
        });

        // Create new action node
        const newNode: WorkflowNode = {
          id: nanoid(),
          type: actionTemplate.type,
          position,
          data: {
            label: actionTemplate.label,
            description: actionTemplate.description,
            type: actionTemplate.type,
            config: actionTemplate.defaultConfig,
            status: "idle",
          },
        };

        addNode(newNode);

        // Create connection from the source node to the new node
        const newEdge = {
          id: nanoid(),
          source: connectingNodeId.current,
          target: newNode.id,
          type: "animated",
        };
        setEdges([...edges, newEdge]);
      }

      connectingNodeId.current = null;
    },
    [
      getClientPosition,
      calculateMenuPosition,
      screenToFlowPosition,
      addNode,
      edges,
      setEdges,
    ]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      if (selectedNodes.length === 0) {
        setSelectedNode(null);
      } else if (selectedNodes.length === 1) {
        setSelectedNode(selectedNodes[0].id);
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
        connectionMode={ConnectionMode.Strict}
        defaultViewport={defaultViewport}
        edges={edges}
        edgeTypes={edgeTypes}
        elementsSelectable={!isGenerating}
        fitView={shouldFitView}
        isValidConnection={isValidConnection}
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
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <title>Edge arrow marker definition</title>
          <defs>
            <marker
              id="edge-arrow"
              markerHeight="20"
              markerUnits="strokeWidth"
              markerWidth="20"
              orient="auto"
              refX="10"
              refY="6"
            >
              <path
                className="text-foreground"
                d="M 0 0 L 12 6 L 0 12 z"
                fill="currentColor"
              />
            </marker>
          </defs>
        </svg>
        <Controls />
        <MiniMap
          bgColor="var(--sidebar)"
          className="hidden md:flex"
          nodeStrokeColor="var(--border)"
        />
      </Canvas>
    </div>
  );
}
