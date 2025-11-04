"use client";

import { useAtom, useSetAtom } from "jotai";
import { MoreVertical, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
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
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AvailableOutputs } from "./available-outputs";
import { ActionConfig } from "./config/action-config";
import { TriggerConfig } from "./config/trigger-config";
import { WorkflowRuns } from "./workflow-runs";

export const NodeConfigPanel = () => {
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const [activeTab, setActiveTab] = useAtom(propertiesPanelActiveTabAtom);
  const panelRef = useRef<HTMLDivElement>(null);

  const [showDeleteNodeAlert, setShowDeleteNodeAlert] = useState(false);
  const [showDeleteRunsAlert, setShowDeleteRunsAlert] = useState(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

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
        <div
          className="absolute top-20 right-4 bottom-4 hidden w-89 flex-col rounded-lg border bg-background/80 backdrop-blur-sm md:flex"
          ref={panelRef}
        >
          <Tabs defaultValue="properties">
            <TabsList className="h-auto w-full rounded-none border-b bg-transparent p-3">
              <TabsTrigger
                className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="properties"
              >
                Properties
              </TabsTrigger>
              <TabsTrigger
                className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                value="runs"
              >
                Runs
              </TabsTrigger>
            </TabsList>
            <TabsContent className="p-3" value="properties">
              <div className="text-muted-foreground text-sm">
                Select a node to configure
              </div>
            </TabsContent>
            <TabsContent className="p-3" value="runs">
              <WorkflowRuns isActive={activeTab === "runs"} />
            </TabsContent>
          </Tabs>
        </div>

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
      <div
        className="absolute top-20 right-4 bottom-4 hidden w-89 flex-col rounded-lg border bg-background/80 backdrop-blur-sm md:flex"
        ref={panelRef}
      >
        <Tabs defaultValue="properties">
          <TabsList className="h-auto w-full rounded-none border-b bg-transparent p-3">
            <TabsTrigger
              className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="properties"
            >
              Properties
            </TabsTrigger>
            <TabsTrigger
              className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="runs"
            >
              Runs
            </TabsTrigger>
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
          </TabsList>
          <TabsContent className="p-3" value="properties">
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
          </TabsContent>
          <TabsContent className="p-3" value="runs">
            <WorkflowRuns isActive={activeTab === "runs"} />
          </TabsContent>
        </Tabs>
      </div>

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
};
