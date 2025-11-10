import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { atom } from "jotai";
import { workflowApi } from "./workflow-api";

export type WorkflowNodeType = "trigger" | "action" | "condition" | "transform";

export type WorkflowNodeData = {
  label: string;
  description?: string;
  type: WorkflowNodeType;
  config?: Record<string, unknown>;
  status?: "idle" | "running" | "success" | "error";
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// Atoms for workflow state (now backed by database)
export const nodesAtom = atom<WorkflowNode[]>([]);
export const edgesAtom = atom<WorkflowEdge[]>([]);
export const selectedNodeAtom = atom<string | null>(null);
export const isExecutingAtom = atom(false);
export const isLoadingAtom = atom(false);
export const isGeneratingAtom = atom(false);
export const currentWorkflowIdAtom = atom<string | null>(null);
export const currentWorkflowNameAtom = atom<string>("Untitled Workflow");
export const currentVercelProjectNameAtom = atom<string | null>(null);

// UI state atoms
export const propertiesPanelActiveTabAtom = atom<string>("runs");

// Derived atoms for node/edge operations
export const onNodesChangeAtom = atom(
  null,
  (get, set, changes: NodeChange[]) => {
    const currentNodes = get(nodesAtom);
    const newNodes = applyNodeChanges(changes, currentNodes) as WorkflowNode[];
    set(nodesAtom, newNodes);

    // Sync selection state with selectedNodeAtom
    const selectedNode = newNodes.find((n) => n.selected);
    if (selectedNode) {
      set(selectedNodeAtom, selectedNode.id);
    } else if (get(selectedNodeAtom)) {
      // If no node is selected in ReactFlow but we have a selection, clear it
      const currentSelection = get(selectedNodeAtom);
      const stillExists = newNodes.find((n) => n.id === currentSelection);
      if (!stillExists) {
        set(selectedNodeAtom, null);
      }
    }
  }
);

export const onEdgesChangeAtom = atom(
  null,
  (get, set, changes: EdgeChange[]) => {
    const currentEdges = get(edgesAtom);
    const newEdges = applyEdgeChanges(changes, currentEdges) as WorkflowEdge[];
    set(edgesAtom, newEdges);
  }
);

export const addNodeAtom = atom(null, (get, set, node: WorkflowNode) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  // Deselect all existing nodes and add new node as selected
  const updatedNodes = currentNodes.map((n) => ({ ...n, selected: false }));
  const newNode = { ...node, selected: true };
  const newNodes = [...updatedNodes, newNode];
  set(nodesAtom, newNodes);

  // Auto-select the newly added node
  set(selectedNodeAtom, node.id);
});

export const updateNodeDataAtom = atom(
  null,
  (get, set, { id, data }: { id: string; data: Partial<WorkflowNodeData> }) => {
    const currentNodes = get(nodesAtom);
    const newNodes = currentNodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    );
    set(nodesAtom, newNodes);
  }
);

export const deleteNodeAtom = atom(null, (get, set, nodeId: string) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  const newNodes = currentNodes.filter((node) => node.id !== nodeId);
  const newEdges = currentEdges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId
  );

  set(nodesAtom, newNodes);
  set(edgesAtom, newEdges);

  if (get(selectedNodeAtom) === nodeId) {
    set(selectedNodeAtom, null);
  }
});

export const clearWorkflowAtom = atom(null, (get, set) => {
  // Save current state to history before making changes
  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);
  set(futureAtom, []);

  set(nodesAtom, []);
  set(edgesAtom, []);
  set(selectedNodeAtom, null);
});

// Load workflow from database
export const loadWorkflowAtom = atom(null, async (_get, set) => {
  try {
    set(isLoadingAtom, true);
    const workflow = await workflowApi.getCurrent();
    set(nodesAtom, workflow.nodes);
    set(edgesAtom, workflow.edges);
    if (workflow.id) {
      set(currentWorkflowIdAtom, workflow.id);
    }
  } catch (error) {
    console.error("Failed to load workflow:", error);
  } finally {
    set(isLoadingAtom, false);
  }
});

// Save workflow with a name
export const saveWorkflowAsAtom = atom(
  null,
  async (
    get,
    _set,
    { name, description }: { name: string; description?: string }
  ) => {
    const nodes = get(nodesAtom);
    const edges = get(edgesAtom);

    try {
      const workflow = await workflowApi.create({
        name,
        description,
        nodes,
        edges,
      });
      return workflow;
    } catch (error) {
      console.error("Failed to save workflow:", error);
      throw error;
    }
  }
);

// Workflow toolbar UI state atoms
export const showClearDialogAtom = atom(false);
export const showDeleteDialogAtom = atom(false);
export const isSavingAtom = atom(false);

// Undo/Redo state
type HistoryState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

const historyAtom = atom<HistoryState[]>([]);
const futureAtom = atom<HistoryState[]>([]);

// Undo atom
export const undoAtom = atom(null, (get, set) => {
  const history = get(historyAtom);
  if (history.length === 0) return;

  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const future = get(futureAtom);

  // Save current state to future
  set(futureAtom, [...future, { nodes: currentNodes, edges: currentEdges }]);

  // Pop from history and set as current
  const newHistory = [...history];
  const previousState = newHistory.pop()!;
  set(historyAtom, newHistory);
  set(nodesAtom, previousState.nodes);
  set(edgesAtom, previousState.edges);
});

// Redo atom
export const redoAtom = atom(null, (get, set) => {
  const future = get(futureAtom);
  if (future.length === 0) return;

  const currentNodes = get(nodesAtom);
  const currentEdges = get(edgesAtom);
  const history = get(historyAtom);

  // Save current state to history
  set(historyAtom, [...history, { nodes: currentNodes, edges: currentEdges }]);

  // Pop from future and set as current
  const newFuture = [...future];
  const nextState = newFuture.pop()!;
  set(futureAtom, newFuture);
  set(nodesAtom, nextState.nodes);
  set(edgesAtom, nextState.edges);
});

// Can undo/redo atoms
export const canUndoAtom = atom((get) => get(historyAtom).length > 0);
export const canRedoAtom = atom((get) => get(futureAtom).length > 0);
