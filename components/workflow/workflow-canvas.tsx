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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { AIPrompt } from "@/components/ai-elements/prompt";
import "@xyflow/react/dist/style.css";

import { PlayCircle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import {
  addNodeAtom,
  autosaveAtom,
  currentWorkflowIdAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isGeneratingAtom,
  nodesAtom,
  onEdgesChangeAtom,
  onNodesChangeAtom,
  selectedEdgeAtom,
  selectedNodeAtom,
  showMinimapAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store";
import { Edge } from "../ai-elements/edge";
import { Panel } from "../ai-elements/panel";
import { ActionNode } from "./nodes/action-node";
import { AddNode } from "./nodes/add-node";
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
    defaultConfig: {},
  },
];

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};

type WorkflowCanvasProps = {
  showMinimap?: boolean;
};

export function WorkflowCanvas(_props: WorkflowCanvasProps) {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const currentWorkflowId = useAtomValue(currentWorkflowIdAtom);
  const [showMinimap] = useAtom(showMinimapAtom);
  const onNodesChange = useSetAtom(onNodesChangeAtom);
  const onEdgesChange = useSetAtom(onEdgesChangeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setSelectedEdge = useSetAtom(selectedEdgeAtom);
  const addNode = useSetAtom(addNodeAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const triggerAutosave = useSetAtom(autosaveAtom);
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const connectingNodeId = useRef<string | null>(null);
  const justCreatedNodeFromConnection = useRef(false);
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
      setShouldFitView(true);
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
      add: AddNode,
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
      // Trigger immediate autosave when nodes are connected
      triggerAutosave({ immediate: true });
    },
    [edges, setEdges, setHasUnsavedChanges, triggerAutosave]
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

      // Get client position first
      const { clientX, clientY } = getClientPosition(event);

      // For touch events, use elementFromPoint to get the actual element at the touch position
      // For mouse events, use event.target as before
      const target =
        "changedTouches" in event
          ? document.elementFromPoint(clientX, clientY)
          : (event.target as Element);

      if (!target) {
        connectingNodeId.current = null;
        return;
      }

      const isNode = target.closest(".react-flow__node");
      const isHandle = target.closest(".react-flow__handle");

      if (!(isNode || isHandle)) {
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

        // Center the node vertically at the cursor position
        // Node height is 192px (h-48 in Tailwind)
        const nodeHeight = 192;
        position.y -= nodeHeight / 2;

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
          selected: true,
        };

        addNode(newNode);
        setSelectedNode(newNode.id);

        // Deselect all other nodes and select only the new node
        // Need to do this after a delay because panOnDrag will clear selection
        setTimeout(() => {
          setNodes((currentNodes) =>
            currentNodes.map((n) => ({
              ...n,
              selected: n.id === newNode.id,
            }))
          );
        }, 50);

        // Create connection from the source node to the new node
        const newEdge = {
          id: nanoid(),
          source: connectingNodeId.current,
          target: newNode.id,
          type: "animated",
        };
        setEdges([...edges, newEdge]);
        setHasUnsavedChanges(true);
        // Trigger immediate autosave for the new edge
        triggerAutosave({ immediate: true });

        // Set flag to prevent immediate deselection
        justCreatedNodeFromConnection.current = true;
        setTimeout(() => {
          justCreatedNodeFromConnection.current = false;
        }, 100);
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
      setNodes,
      setSelectedNode,
      setHasUnsavedChanges,
      triggerAutosave,
    ]
  );

  const onPaneClick = useCallback(() => {
    // Don't deselect if we just created a node from a connection
    if (justCreatedNodeFromConnection.current) {
      return;
    }
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      // Don't clear selection if we just created a node from a connection
      if (justCreatedNodeFromConnection.current && selectedNodes.length === 0) {
        return;
      }

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
        fitViewOptions={{
          maxZoom: 1,
          minZoom: 0.5,
          padding: 0.2,
        }}
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
        <Panel
          className="workflow-controls-panel border-none bg-transparent p-0"
          position="bottom-left"
        >
          <Controls />
        </Panel>
        {showMinimap && (
          <MiniMap bgColor="var(--sidebar)" nodeStrokeColor="var(--border)" />
        )}
      </Canvas>

      {/* AI Prompt */}
      {currentWorkflowId && <AIPrompt workflowId={currentWorkflowId} />}
    </div>
  );
}
