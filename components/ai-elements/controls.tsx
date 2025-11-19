"use client";

import { useReactFlow } from "@xyflow/react";
import { Minus, Plus, Maximize2, MapPin, MapPinXInside } from "lucide-react";
import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showMinimapAtom } from "@/lib/workflow-store";

export const Controls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 300 });
  };

  const handleToggleMinimap = () => {
    setShowMinimap(!showMinimap);
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
        onClick={handleToggleMinimap}
        size="icon"
        title={showMinimap ? "Hide minimap" : "Show minimap"}
        variant="secondary"
      >
        {showMinimap ? (
          <MapPin className="size-4" />
        ) : (
          <MapPinXInside className="size-4" />
        )}
      </Button>
    </ButtonGroup>
  );
};
