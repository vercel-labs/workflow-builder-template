import { Background, ReactFlow, type ReactFlowProps } from "@xyflow/react";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { canvasInteractionModeAtom } from "@/lib/workflow-store";
import "@xyflow/react/dist/style.css";

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => {
  const interactionMode = useAtomValue(canvasInteractionModeAtom);
  const isSelectMode = interactionMode === "select";

  return (
    <ReactFlow
      data-interaction-mode={interactionMode}
      deleteKeyCode={["Backspace", "Delete"]}
      fitView
      panActivationKeyCode={null}
      // Select mode: drag draws a selection box, middle mouse still pans
      panOnDrag={isSelectMode ? [1] : true}
      selectionOnDrag={isSelectMode}
      zoomOnDoubleClick={false}
      zoomOnPinch
      {...props}
    >
      <Background 
        bgColor="var(--sidebar)" 
        color="var(--border)" 
        gap={24} 
        size={2}
      />
      {children}
    </ReactFlow>
  );
};
