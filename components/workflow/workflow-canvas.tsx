"use client";

import {
  ConnectionMode,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
  type OnConnectStartParams,
  useReactFlow,
  type Connection as XYFlowConnection,
  type Edge as XYFlowEdge,
} from "@xyflow/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { AIPrompt } from "@/components/ai-elements/prompt";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
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
  isPanelAnimatingAtom,
  isTransitioningFromHomepageAtom,
  nodesAtom,
  onEdgesChangeAtom,
  onNodesChangeAtom,
  propertiesPanelActiveTabAtom,
  rightPanelWidthAtom,
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: React Flow canvas requires complex setup
export function WorkflowCanvas() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const currentWorkflowId = useAtomValue(currentWorkflowIdAtom);
  const [showMinimap] = useAtom(showMinimapAtom);
  const rightPanelWidth = useAtomValue(rightPanelWidthAtom);
  const isPanelAnimating = useAtomValue(isPanelAnimatingAtom);
  const [isTransitioningFromHomepage, setIsTransitioningFromHomepage] = useAtom(
    isTransitioningFromHomepageAtom
  );
  const onNodesChange = useSetAtom(onNodesChangeAtom);
  const onEdgesChange = useSetAtom(onEdgesChangeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setSelectedEdge = useSetAtom(selectedEdgeAtom);
  const addNode = useSetAtom(addNodeAtom);
  const setHasUnsavedChanges = useSetAtom(hasUnsavedChangesAtom);
  const triggerAutosave = useSetAtom(autosaveAtom);
  const setActiveTab = useSetAtom(propertiesPanelActiveTabAtom);
  const { screenToFlowPosition, fitView, getViewport, setViewport } =
    useReactFlow();

  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<"source" | "target" | null>(null);
  const justCreatedNodeFromConnection = useRef(false);
  const viewportInitialized = useRef(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [contextMenuState, setContextMenuState] =
    useState<ContextMenuState>(null);

  // Context menu handlers
  const { onNodeContextMenu, onEdgeContextMenu, onPaneContextMenu } =
    useContextMenuHandlers(screenToFlowPosition, setContextMenuState);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  // Track which workflow we've fitted view for to prevent re-running
  const fittedViewForWorkflowRef = useRef<string | null | undefined>(undefined);
  // Track if we have real nodes (not just placeholder "add" node)
  const hasRealNodes = nodes.some((n) => n.type !== "add");
  const hadRealNodesRef = useRef(false);
  // Pre-shift viewport when transitioning from homepage (before sidebar animates)
  const hasPreShiftedRef = useRef(false);
  useEffect(() => {
    if (isTransitioningFromHomepage && !hasPreShiftedRef.current) {
      hasPreShiftedRef.current = true;

      // Check if sidebar is collapsed from cookie (atom may not be initialized yet)
      const collapsedCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sidebar-collapsed="));
      const isCollapsed = collapsedCookie?.split("=")[1] === "true";

      // Skip if sidebar is collapsed - content should stay centered
      if (isCollapsed) {
        return;
      }

      // Shift viewport left to center content in the future visible area
      // Default sidebar is 30%, so shift by 15% of window width
      const viewport = getViewport();
      const defaultSidebarPercent = 0.3;
      const shiftPixels = (window.innerWidth * defaultSidebarPercent) / 2;
      setViewport(
        { ...viewport, x: viewport.x - shiftPixels },
        { duration: 0 }
      );
    }
  }, [isTransitioningFromHomepage, getViewport, setViewport]);

  // Fit view when workflow changes (only on initial load, not home -> workflow)
  useEffect(() => {
    // Skip if we've already fitted view for this workflow
    if (fittedViewForWorkflowRef.current === currentWorkflowId) {
      return;
    }

    // Skip fitView for homepage -> workflow transition (viewport already set from homepage)
    if (isTransitioningFromHomepage && viewportInitialized.current) {
      fittedViewForWorkflowRef.current = currentWorkflowId;
      setIsCanvasReady(true);
      // Clear the flag after using it
      setIsTransitioningFromHomepage(false);
      return;
    }

    // Use fitView after a brief delay to ensure React Flow and nodes are ready
    setTimeout(() => {
      fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.2, duration: 0 });
      fittedViewForWorkflowRef.current = currentWorkflowId;
      viewportInitialized.current = true;
      // Show canvas immediately so width animation can be seen
      setIsCanvasReady(true);
      // Clear the flag
      setIsTransitioningFromHomepage(false);
    }, 0);
  }, [
    currentWorkflowId,
    fitView,
    isTransitioningFromHomepage,
    setIsTransitioningFromHomepage,
  ]);

  // Fit view when first real node is added on homepage
  useEffect(() => {
    if (currentWorkflowId) {
      return; // Only for homepage
    }
    // Check if we just got our first real node
    if (hasRealNodes && !hadRealNodesRef.current) {
      hadRealNodesRef.current = true;
      // Fit view to center the new node
      setTimeout(() => {
        fitView({ maxZoom: 1, minZoom: 0.5, padding: 0.2, duration: 0 });
        viewportInitialized.current = true;
        setIsCanvasReady(true);
      }, 0);
    } else if (!hasRealNodes) {
      // Reset when back to placeholder only
      hadRealNodesRef.current = false;
    }
  }, [currentWorkflowId, hasRealNodes, fitView]);

  // Keyboard shortcut for fit view (Cmd+/ or Ctrl+/)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+/ (Mac) or Ctrl+/ (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        fitView({ padding: 0.2, duration: 300 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fitView]);

  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      add: AddNode,
    }),
    []
  );

  const nodeHasHandle = useCallback(
    (nodeId: string, handleType: "source" | "target") => {
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) {
        return false;
      }

      if (node.type === "add") {
        return false;
      }

      if (handleType === "target") {
        return node.type !== "trigger";
      }

      return true;
    },
    [nodes]
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
      connectingHandleType.current = params.handleType;
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

  const handleConnectionToExistingNode = useCallback(
    (nodeElement: Element) => {
      const targetNodeId = nodeElement.getAttribute("data-id");
      const fromSource = connectingHandleType.current === "source";
      const requiredHandle = fromSource ? "target" : "source";
      const connectingId = connectingNodeId.current;

      if (
        targetNodeId &&
        connectingId &&
        targetNodeId !== connectingId &&
        nodeHasHandle(targetNodeId, requiredHandle)
      ) {
        const sourceId = fromSource ? connectingId : targetNodeId;
        const targetId = fromSource ? targetNodeId : connectingId;
        onConnect({
          source: sourceId,
          target: targetId,
          sourceHandle: null,
          targetHandle: null,
        });
      }
    },
    [nodeHasHandle, onConnect]
  );

  const handleConnectionToNewNode = useCallback(
    (event: MouseEvent | TouchEvent, clientX: number, clientY: number) => {
      const sourceNodeId = connectingNodeId.current;
      if (!sourceNodeId) {
        return;
      }

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
      setActiveTab("properties");

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
      const fromSource = connectingHandleType.current === "source";

      const newEdge = {
        id: nanoid(),
        source: fromSource ? sourceNodeId : newNode.id,
        target: fromSource ? newNode.id : sourceNodeId,
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
    },
    [
      calculateMenuPosition,
      screenToFlowPosition,
      addNode,
      edges,
      setEdges,
      setNodes,
      setSelectedNode,
      setActiveTab,
      setHasUnsavedChanges,
      triggerAutosave,
    ]
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

      const nodeElement = target.closest(".react-flow__node");
      const isHandle = target.closest(".react-flow__handle");

      // Create connection on edge dragged over node release
      if (nodeElement && !isHandle && connectingHandleType.current) {
        handleConnectionToExistingNode(nodeElement);
        connectingNodeId.current = null;
        connectingHandleType.current = null;
        return;
      }

      if (!(nodeElement || isHandle)) {
        handleConnectionToNewNode(event, clientX, clientY);
      }

      connectingNodeId.current = null;
      connectingHandleType.current = null;
    },
    [
      getClientPosition,
      handleConnectionToExistingNode,
      handleConnectionToNewNode,
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

  return (
    <div
      className="relative h-full bg-background"
      data-testid="workflow-canvas"
      style={{
        opacity: isCanvasReady ? 1 : 0,
        width: rightPanelWidth ? `calc(100% - ${rightPanelWidth})` : "100%",
        transition: isPanelAnimating
          ? "width 300ms ease-out, opacity 300ms"
          : "opacity 300ms",
      }}
    >
      {/* Toolbar */}
      <div className="pointer-events-auto">
        <WorkflowToolbar workflowId={currentWorkflowId ?? undefined} />
      </div>

      {/* React Flow Canvas */}
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
