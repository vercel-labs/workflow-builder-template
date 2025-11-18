import { Background, ReactFlow, type ReactFlowProps } from "@xyflow/react";
import type { ReactNode } from "react";
import "@xyflow/react/dist/style.css";
import { useIsMobile } from "@/hooks/use-mobile";

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => {
  const isMobile = useIsMobile();

  return (
    <ReactFlow
      deleteKeyCode={["Backspace", "Delete"]}
      fitView
      panActivationKeyCode={null}
      panOnDrag={isMobile}
      panOnScroll
      selectionOnDrag={!isMobile}
      zoomOnDoubleClick={false}
      {...props}
    >
      <Background 
        bgColor="var(--sidebar)" 
        color="var(--border)" 
        gap={24} 
        size={1}
      />
      {children}
    </ReactFlow>
  );
};
