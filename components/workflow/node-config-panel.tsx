"use client";

import { useAtom, useSetAtom } from "jotai";
import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  currentWorkflowIdAtom,
  deleteNodeAtom,
  isGeneratingAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  propertiesPanelResizingAtom,
  propertiesPanelWidthAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { AvailableOutputs } from "./available-outputs";
import { ActionConfig } from "./config/action-config";
import { TriggerConfig } from "./config/trigger-config";
import { WorkflowRuns } from "./workflow-runs";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export function NodeConfigPanel() {
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const [panelWidth, setPanelWidth] = useAtom(propertiesPanelWidthAtom);
  const [isResizing, setIsResizing] = useAtom(propertiesPanelResizingAtom);
  const [activeTab, setActiveTab] = useAtom(propertiesPanelActiveTabAtom);
  const panelRef = useRef<HTMLDivElement>(null);

  const [showDeleteNodeAlert, setShowDeleteNodeAlert] = useState(false);
  const [showDeleteRunsAlert, setShowDeleteRunsAlert] = useState(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  // Load saved width from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("nodeConfigPanelWidth");
    if (saved) {
      const width = Number.parseInt(saved, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setPanelWidth(width);
      }
    }
  }, [setPanelWidth]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    // Prevent text selection while resizing
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = panelRect.right - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("nodeConfigPanelWidth", panelWidth.toString());
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, panelWidth, setPanelWidth, setIsResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      setShowDeleteNodeAlert(false);
    }
  };

  const handleDeleteAllRuns = async () => {
    if (!currentWorkflowId) return;

    try {
      const response = await fetch(
        `/api/workflows/${currentWorkflowId}/executions`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to delete runs"
        );
      }

      const { toast } = await import("sonner");
      toast.success("All runs deleted");
      setShowDeleteRunsAlert(false);
    } catch (error) {
      console.error("Failed to delete runs:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete runs";
      toast.error(errorMessage);
    }
  };

  if (!selectedNode) {
    return (
      <>
        <Card
          className="relative hidden h-full flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l md:flex"
          ref={panelRef}
          style={{ width: `${panelWidth}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute top-0 bottom-0 left-0 z-10 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
            onMouseDown={handleResizeStart}
            style={{ cursor: isResizing ? "col-resize" : undefined }}
          />
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
            <Button
              className={activeTab === "properties" ? "font-semibold" : ""}
              onClick={() => setActiveTab("properties")}
              variant="ghost"
            >
              Properties
            </Button>
            <Button
              className={activeTab === "runs" ? "font-semibold" : ""}
              onClick={() => setActiveTab("runs")}
              variant="ghost"
            >
              Runs
            </Button>
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 w-8" size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {activeTab === "runs" && (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteRunsAlert(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Runs
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {activeTab === "properties" && (
              <div className="text-muted-foreground text-sm">
                Select a node to configure
              </div>
            )}
            {activeTab === "runs" && (
              <WorkflowRuns isActive={activeTab === "runs"} />
            )}
          </CardContent>
        </Card>

        {/* Delete All Runs Alert Dialog */}
        <AlertDialog
          onOpenChange={setShowDeleteRunsAlert}
          open={showDeleteRunsAlert}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Runs</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all workflow runs? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAllRuns}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  const handleUpdateLabel = (label: string) => {
    updateNodeData({ id: selectedNode.id, data: { label } });
  };

  const handleUpdateDescription = (description: string) => {
    updateNodeData({ id: selectedNode.id, data: { description } });
  };

  const handleUpdateConfig = (key: string, value: string) => {
    const newConfig = { ...selectedNode.data.config, [key]: value };
    updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
      />

      {/* Properties panel - Mobile: Fixed sidebar, Desktop: Resizable sidebar */}
      <Card
        className="fixed top-0 right-0 bottom-0 z-50 flex h-full w-80 flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l md:relative md:z-0"
        ref={panelRef}
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize handle - only visible on desktop */}
        <div
          className="absolute top-0 bottom-0 left-0 z-10 hidden w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 md:block"
          onMouseDown={handleResizeStart}
          style={{ cursor: isResizing ? "col-resize" : undefined }}
        />
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
          <Button
            className={activeTab === "properties" ? "font-semibold" : ""}
            onClick={() => setActiveTab("properties")}
            variant="ghost"
          >
            Properties
          </Button>
          <Button
            className={activeTab === "runs" ? "font-semibold" : ""}
            onClick={() => setActiveTab("runs")}
            variant="ghost"
          >
            Runs
          </Button>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-8 w-8" size="icon" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeTab === "properties" && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteNodeAlert(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Node
                  </DropdownMenuItem>
                )}
                {activeTab === "runs" && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteRunsAlert(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Runs
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {activeTab === "properties" && (
            <div className="space-y-4">
              {selectedNode.data.type === "trigger" && (
                <TriggerConfig
                  config={selectedNode.data.config || {}}
                  disabled={isGenerating}
                  onUpdateConfig={handleUpdateConfig}
                />
              )}

              {selectedNode.data.type === "action" && (
                <ActionConfig
                  config={selectedNode.data.config || {}}
                  disabled={isGenerating}
                  onUpdateConfig={handleUpdateConfig}
                />
              )}

              {selectedNode.data.type === "condition" && (
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Input
                    disabled={isGenerating}
                    id="condition"
                    onChange={(e) =>
                      handleUpdateConfig("condition", e.target.value)
                    }
                    placeholder="e.g., value > 100"
                    value={
                      (selectedNode.data.config?.condition as string) || ""
                    }
                  />
                </div>
              )}

              {selectedNode.data.type === "transform" && (
                <div className="space-y-2">
                  <Label htmlFor="transformType">Transform Type</Label>
                  <Input
                    disabled={isGenerating}
                    id="transformType"
                    onChange={(e) =>
                      handleUpdateConfig("transformType", e.target.value)
                    }
                    placeholder="e.g., Map Data, Filter, Aggregate"
                    value={
                      (selectedNode.data.config?.transformType as string) || ""
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  disabled={isGenerating}
                  id="label"
                  onChange={(e) => handleUpdateLabel(e.target.value)}
                  value={selectedNode.data.label}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  disabled={isGenerating}
                  id="description"
                  onChange={(e) => handleUpdateDescription(e.target.value)}
                  placeholder="Optional description"
                  value={selectedNode.data.description || ""}
                />
              </div>

              {/* Show available outputs from previous nodes */}
              {(selectedNode.data.type === "action" ||
                selectedNode.data.type === "condition" ||
                selectedNode.data.type === "transform") && <AvailableOutputs />}
            </div>
          )}
          {activeTab === "runs" && (
            <WorkflowRuns isActive={activeTab === "runs"} />
          )}
        </CardContent>
      </Card>

      {/* Delete Node Alert Dialog */}
      <AlertDialog
        onOpenChange={setShowDeleteNodeAlert}
        open={showDeleteNodeAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this node? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Runs Alert Dialog */}
      <AlertDialog
        onOpenChange={setShowDeleteRunsAlert}
        open={showDeleteRunsAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Runs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all workflow runs? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllRuns}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
