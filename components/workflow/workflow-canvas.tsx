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
import {
  type ContextMenuState,
  useContextMenuHandlers,
  WorkflowContextMenu,
} from "./workflow-context-menu";

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

export function WorkflowCanvas() {
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
  const { screenToFlowPosition, setViewport, fitView } = useReactFlow();

  const connectingNodeId = useRef<string | null>(null);
  const justCreatedNodeFromConnection = useRef(false);
  const viewportInitialized = useRef(false);
  const [contextMenuState, setContextMenuState] =
    useState<ContextMenuState>(null);

  // Context menu handlers
  const { onNodeContextMenu, onEdgeContextMenu, onPaneContextMenu } =
    useContextMenuHandlers(screenToFlowPosition, setContextMenuState);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  // Load saved viewport when workflow changes
  useEffect(() => {
    console.log("[Viewport] Effect triggered", {
      currentWorkflowId,
      viewportInitialized: viewportInitialized.current,
    });

    if (!currentWorkflowId) {
      console.log("[Viewport] No workflow ID, using fitView");
      // Use imperative fitView after a brief delay for React Flow to be ready
      setTimeout(() => {
        fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.2, duration: 0 });
        viewportInitialized.current = true;
      }, 0);
      return;
    }

    const saved = localStorage.getItem(
      `workflow-viewport-${currentWorkflowId}`
    );
    console.log("[Viewport] Checking localStorage", {
      key: `workflow-viewport-${currentWorkflowId}`,
      found: !!saved,
      value: saved,
    });

    if (saved) {
      try {
        const viewport = JSON.parse(saved) as Viewport;
        console.log("[Viewport] Restoring saved viewport", viewport);
        // Set viewport immediately
        setViewport(viewport, { duration: 0 });
        viewportInitialized.current = true;
      } catch (error) {
        console.error("[Viewport] Failed to parse viewport:", error);
        fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.2, duration: 0 });
        viewportInitialized.current = true;
      }
    } else {
      console.log("[Viewport] No saved viewport, using fitView");
      fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.2, duration: 0 });
      viewportInitialized.current = true;
    }
  }, [currentWorkflowId, setViewport, fitView]);

  // Save viewport changes
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      console.log("[Viewport] onMoveEnd", {
        currentWorkflowId,
        viewportInitialized: viewportInitialized.current,
        viewport,
      });
      if (!(currentWorkflowId && viewportInitialized.current)) {
        console.log("[Viewport] onMoveEnd - skipping save (not initialized)");
        return;
      }
      console.log("[Viewport] onMoveEnd - saving viewport");
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
    closeContextMenu();
  }, [setSelectedNode, setSelectedEdge, closeContextMenu]);

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

  console.log("[Viewport] Render", { currentWorkflowId });

  return (
    <div className="relative h-full w-full bg-background">
      <Canvas
        className="bg-background"
        connectionLineComponent={Connection}
        connectionMode={ConnectionMode.Strict}
        edges={edges}
        edgeTypes={edgeTypes}
        elementsSelectable={!isGenerating}
        isValidConnection={isValidConnection}
        nodes={nodes}
        nodesConnectable={!isGenerating}
        nodesDraggable={!isGenerating}
        nodeTypes={nodeTypes}
        onConnect={isGenerating ? undefined : onConnect}
        onConnectEnd={isGenerating ? undefined : onConnectEnd}
        onConnectStart={isGenerating ? undefined : onConnectStart}
        onEdgeContextMenu={isGenerating ? undefined : onEdgeContextMenu}
        onEdgesChange={isGenerating ? undefined : onEdgesChange}
        onMoveEnd={onMoveEnd}
        onNodeClick={isGenerating ? undefined : onNodeClick}
        onNodeContextMenu={isGenerating ? undefined : onNodeContextMenu}
        onNodesChange={isGenerating ? undefined : onNodesChange}
        onPaneClick={onPaneClick}
        onPaneContextMenu={isGenerating ? undefined : onPaneContextMenu}
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

      {/* Context Menu */}
      <WorkflowContextMenu
        menuState={contextMenuState}
        onClose={closeContextMenu}
      />
    </div>
  );
}
