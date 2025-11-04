'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  type Connection,
  type OnConnect,
  BackgroundVariant,
  useReactFlow,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  nodesAtom,
  edgesAtom,
  onNodesChangeAtom,
  onEdgesChangeAtom,
  selectedNodeAtom,
  isGeneratingAtom,
  addNodeAtom,
  currentWorkflowIdAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from '@/lib/workflow-store';
import { TriggerNode } from './nodes/trigger-node';
import { ActionNode } from './nodes/action-node';
import { ConditionNode } from './nodes/condition-node';
import { TransformNode } from './nodes/transform-node';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlayCircle, Zap, GitBranch, Shuffle } from 'lucide-react';

const nodeTemplates = [
  {
    type: 'trigger' as WorkflowNodeType,
    label: 'Trigger',
    description: 'Start your workflow',
    icon: PlayCircle,
    defaultConfig: { triggerType: 'Manual' },
  },
  {
    type: 'action' as WorkflowNodeType,
    label: 'Action',
    description: 'Perform an action',
    icon: Zap,
    defaultConfig: { actionType: 'HTTP Request', endpoint: 'https://api.example.com' },
  },
  {
    type: 'condition' as WorkflowNodeType,
    label: 'Condition',
    description: 'Branch your workflow',
    icon: GitBranch,
    defaultConfig: { condition: 'If true' },
  },
  {
    type: 'transform' as WorkflowNodeType,
    label: 'Transform',
    description: 'Transform data',
    icon: Shuffle,
    defaultConfig: { transformType: 'Map Data' },
  },
];

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
  const [defaultViewport, setDefaultViewport] = useState<Viewport | undefined>(undefined);
  const viewportInitialized = useRef(false);

  // Load saved viewport when workflow changes
  useEffect(() => {
    if (!currentWorkflowId) return;

    const saved = localStorage.getItem(`workflow-viewport-${currentWorkflowId}`);
    if (saved) {
      try {
        const viewport = JSON.parse(saved) as Viewport;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDefaultViewport(viewport);
        // Set viewport after a brief delay to ensure ReactFlow is ready
        setTimeout(() => {
          setViewport(viewport, { duration: 0 });
          viewportInitialized.current = true;
        }, 100);
      } catch (error) {
        console.error('Failed to load viewport:', error);
        viewportInitialized.current = true;
      }
    } else {
      setDefaultViewport(undefined);
      // Allow saving viewport after fitView completes
      setTimeout(() => {
        viewportInitialized.current = true;
      }, 500);
    }
  }, [currentWorkflowId, setViewport]);

  // Save viewport changes
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!currentWorkflowId || !viewportInitialized.current) return;
      localStorage.setItem(`workflow-viewport-${currentWorkflowId}`, JSON.stringify(viewport));
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
    (connection: Connection) => {
      const newEdge = {
        id: uuidv4(),
        ...connection,
        type: 'default',
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
      const isNode = target.closest('.react-flow__node');
      const isHandle = target.closest('.react-flow__handle');

      if (!isNode && !isHandle) {
        // Get mouse position relative to the viewport
        const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
        const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;

        // Get the ReactFlow wrapper element to calculate offset
        const reactFlowBounds = (event.target as Element)
          .closest('.react-flow')
          ?.getBoundingClientRect();

        // Adjust position relative to the ReactFlow container
        const adjustedX = reactFlowBounds ? clientX - reactFlowBounds.left : clientX;
        const adjustedY = reactFlowBounds ? clientY - reactFlowBounds.top : clientY;

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
        id: uuidv4(),
        type: template.type,
        position,
        data: {
          label: template.label,
          description: template.description,
          type: template.type,
          config: template.defaultConfig,
          status: 'idle',
        },
      };

      addNode(newNode);

      // Create connection from the source node to the new node
      const newEdge = {
        id: uuidv4(),
        source: menu.id,
        target: newNode.id,
        type: 'default',
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
  }, []);

  return (
    <div className="relative h-full w-full">
      {isGenerating && (
        <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <div className="text-lg font-semibold">Generating workflow...</div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isGenerating ? undefined : onNodesChange}
        onEdgesChange={isGenerating ? undefined : onEdgesChange}
        onConnect={isGenerating ? undefined : onConnect}
        onConnectStart={isGenerating ? undefined : onConnectStart}
        onConnectEnd={isGenerating ? undefined : onConnectEnd}
        onNodeClick={isGenerating ? undefined : onNodeClick}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={defaultViewport}
        fitView={!defaultViewport}
        className="bg-background"
        nodesDraggable={!isGenerating}
        nodesConnectable={!isGenerating}
        elementsSelectable={!isGenerating}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls
          style={{
            background: 'white',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          }}
          className="dark:!bg-[hsl(var(--card))]"
        />
        <MiniMap className="!bg-secondary" />
      </ReactFlow>

      {menu && (
        <div
          style={{
            position: 'absolute',
            top: menu.top,
            left: menu.left,
            zIndex: 50,
          }}
          className="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md"
        >
          {nodeTemplates
            .filter((template) => template.type !== 'trigger')
            .map((template, index, filteredArray) => {
              const Icon = template.icon;
              return (
                <div key={template.type}>
                  <div
                    onClick={() => onAddNodeFromMenu(template)}
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {template.label}
                  </div>
                  {index < filteredArray.length - 1 && <div className="bg-muted -mx-1 my-1 h-px" />}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
