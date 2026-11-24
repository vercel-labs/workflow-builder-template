"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom } from "jotai";
import {
  Hand,
  type LucideIcon,
  MapPin,
  MapPinXInside,
  Maximize2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  canvasInteractionModeAtom,
  showMinimapAtom,
} from "@/lib/workflow-store";

type ControlButtonProps = {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

const ControlButton = ({
  active,
  icon: Icon,
  label,
  onClick,
}: ControlButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "rounded-md border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground",
          active && "border-primary/50 bg-primary/10"
        )}
        onClick={onClick}
        size="icon"
        variant="secondary"
      >
        <Icon className="size-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

export const Controls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);
  const [interactionMode, setInteractionMode] = useAtom(
    canvasInteractionModeAtom
  );
  const isSelectMode = interactionMode === "select";

  // Keyboard shortcut: V toggles between pan and select modes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        setInteractionMode((mode) => (mode === "pan" ? "select" : "pan"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setInteractionMode]);

  return (
    <div className="flex flex-row gap-2">
      <ControlButton
        active={isSelectMode}
        icon={isSelectMode ? MousePointer2 : Hand}
        label={isSelectMode ? "Select mode (V)" : "Pan mode (V)"}
        onClick={() => setInteractionMode(isSelectMode ? "pan" : "select")}
      />
      <ControlButton icon={ZoomIn} label="Zoom in" onClick={() => zoomIn()} />
      <ControlButton
        icon={ZoomOut}
        label="Zoom out"
        onClick={() => zoomOut()}
      />
      <ControlButton
        icon={Maximize2}
        label="Fit to view"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
      />
      <ControlButton
        icon={showMinimap ? MapPin : MapPinXInside}
        label={showMinimap ? "Hide minimap" : "Show minimap"}
        onClick={() => setShowMinimap(!showMinimap)}
      />
    </div>
  );
};
