"use client";

import { useReactFlow } from "@xyflow/react";
import { Minus, Plus, Maximize2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useState } from "react";

export const Controls = () => {
  const { zoomIn, zoomOut, fitView, setInteractive } = useReactFlow();
  const [isInteractive, setIsInteractive] = useState(true);

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 300 });
  };

  const handleToggleInteractivity = () => {
    const newState = !isInteractive;
    setIsInteractive(newState);
    setInteractive(newState);
  };

  return (
    <ButtonGroup orientation="vertical">
      <Button
        className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        onClick={handleZoomIn}
        size="icon"
        title="Zoom in"
        variant="secondary"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        onClick={handleZoomOut}
        size="icon"
        title="Zoom out"
        variant="secondary"
      >
        <Minus className="size-4" />
      </Button>
      <Button
        className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        onClick={handleFitView}
        size="icon"
        title="Fit view"
        variant="secondary"
      >
        <Maximize2 className="size-4" />
      </Button>
      <Button
        className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        onClick={handleToggleInteractivity}
        size="icon"
        title={isInteractive ? "Lock canvas" : "Unlock canvas"}
        variant="secondary"
      >
        {isInteractive ? <Unlock className="size-4" /> : <Lock className="size-4" />}
      </Button>
    </ButtonGroup>
  );
};
