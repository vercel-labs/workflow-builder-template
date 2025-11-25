"use client";

import type { Edge, Node, XYPosition } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Link2Off, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  addNodeAtom,
  deleteEdgeAtom,
  deleteNodeAtom,
  nodesAtom,
  selectedNodeAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";

export type ContextMenuType = "node" | "edge" | "pane" | null;

export type ContextMenuState = {
  type: ContextMenuType;
  position: { x: number; y: number };
  flowPosition?: XYPosition;
  nodeId?: string;
  edgeId?: string;
} | null;

type WorkflowContextMenuProps = {
  menuState: ContextMenuState;
  onClose: () => void;
};

export function WorkflowContextMenu({
  menuState,
  onClose,
}: WorkflowContextMenuProps) {
  const nodes = useAtomValue(nodesAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const addNode = useSetAtom(addNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleDeleteNode = useCallback(() => {
    if (menuState?.nodeId) {
      deleteNode(menuState.nodeId);
    }
    onClose();
  }, [menuState, deleteNode, onClose]);

  const handleDeleteEdge = useCallback(() => {
    if (menuState?.edgeId) {
      deleteEdge(menuState.edgeId);
    }
    onClose();
  }, [menuState, deleteEdge, onClose]);

  const handleAddStep = useCallback(() => {
    if (menuState?.flowPosition) {
      const nodeHeight = 192;
      const newNode: WorkflowNode = {
        id: nanoid(),
        type: "action",
        position: {
          x: menuState.flowPosition.x,
          y: menuState.flowPosition.y - nodeHeight / 2,
        },
        data: {
          label: "",
          description: "",
          type: "action",
          config: {},
          status: "idle",
        },
        selected: true,
      };
      addNode(newNode);
      setSelectedNode(newNode.id);
    }
    onClose();
  }, [menuState, addNode, setSelectedNode, onClose]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuState) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as globalThis.Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Use a small timeout to prevent the menu from closing immediately
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuState, onClose]);

  if (!menuState) {
    return null;
  }

  // Check if the node is a trigger (can't be deleted)
  const isTriggerNode = Boolean(
    menuState.nodeId &&
      nodes.find((n) => n.id === menuState.nodeId)?.data.type === "trigger"
  );

  const getNodeLabel = () => {
    if (!menuState.nodeId) {
      return "Step";
    }
    const node = nodes.find((n) => n.id === menuState.nodeId);
    return node?.data.label || "Step";
  };

  return (
    <div
      className="fade-in-0 zoom-in-95 fixed z-50 min-w-[8rem] animate-in overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      ref={menuRef}
      style={{
        left: menuState.position.x,
        top: menuState.position.y,
      }}
    >
      {menuState.type === "node" && (
        <MenuItem
          disabled={isTriggerNode}
          icon={<Trash2 className="size-4" />}
          label={`Delete ${getNodeLabel()}`}
          onClick={handleDeleteNode}
          variant="destructive"
        />
      )}

      {menuState.type === "edge" && (
        <MenuItem
          icon={<Link2Off className="size-4" />}
          label="Delete Connection"
          onClick={handleDeleteEdge}
          variant="destructive"
        />
      )}

      {menuState.type === "pane" && (
        <MenuItem
          icon={<Plus className="size-4" />}
          label="Add Step"
          onClick={handleAddStep}
        />
      )}
    </div>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

function MenuItem({
  icon,
  label,
  onClick,
  variant = "default",
  disabled,
}: MenuItemProps) {
  return (
    <button
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        variant === "destructive" &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
        disabled && "pointer-events-none opacity-50"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

// Hook helpers for using with React Flow
export function useContextMenuHandlers(
  screenToFlowPosition: (position: { x: number; y: number }) => XYPosition,
  setMenuState: (state: ContextMenuState) => void
) {
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenuState({
        type: "node",
        position: { x: event.clientX, y: event.clientY },
        nodeId: node.id,
      });
    },
    [setMenuState]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setMenuState({
        type: "edge",
        position: { x: event.clientX, y: event.clientY },
        edgeId: edge.id,
      });
    },
    [setMenuState]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setMenuState({
        type: "pane",
        position: { x: event.clientX, y: event.clientY },
        flowPosition,
      });
    },
    [screenToFlowPosition, setMenuState]
  );

  return {
    onNodeContextMenu,
    onEdgeContextMenu,
    onPaneContextMenu,
  };
}
