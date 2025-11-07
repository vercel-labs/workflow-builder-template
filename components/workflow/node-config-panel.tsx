"use client";

import { useAtom, useSetAtom } from "jotai";
import { MenuIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteExecutions } from "@/app/actions/workflow/delete-executions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  currentWorkflowIdAtom,
  deleteNodeAtom,
  isGeneratingAtom,
  nodesAtom,
  selectedNodeAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AvailableOutputs } from "./available-outputs";
import { ActionConfig } from "./config/action-config";
import { TriggerConfig } from "./config/trigger-config";
import { WorkflowRuns } from "./workflow-runs";

const PanelInner = () => {
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
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
    if (!currentWorkflowId) {
      return;
    }

    try {
      await deleteExecutions(currentWorkflowId);
      toast.success("All runs deleted");
      setShowDeleteRunsAlert(false);
    } catch (error) {
      console.error("Failed to delete runs:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete runs";
      toast.error(errorMessage);
    }
  };

  if (!selectedNode) {
    return null;
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
      <Tabs className="size-full" defaultValue="properties">
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
        <TabsContent
          className="flex flex-col overflow-hidden"
          value="properties"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
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
                  value={(selectedNode.data.config?.condition as string) || ""}
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
          <div className="shrink-0 border-t p-4">
            <Button
              onClick={() => setShowDeleteNodeAlert(true)}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Delete Node
            </Button>
          </div>
        </TabsContent>
        <TabsContent className="flex flex-col overflow-hidden" value="runs">
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            <WorkflowRuns />
          </div>
          <div className="shrink-0 border-t p-4">
            <Button
              onClick={() => setShowDeleteRunsAlert(true)}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Delete All Runs
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
    </>
  );
};

export const NodeConfigPanel = () => {
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return null;
  }

  return (
    <>
      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <Panel position="bottom-right">
              <Button className="h-8 w-8" size="icon" variant="ghost">
                <MenuIcon className="size-4" />
              </Button>
            </Panel>
          </DrawerTrigger>
          <DrawerContent>
            <PanelInner />
          </DrawerContent>
        </Drawer>
      </div>

      <div className="absolute top-20 right-4 bottom-4 hidden w-89 flex-col rounded-lg border bg-background/80 backdrop-blur-sm md:flex">
        <PanelInner />
      </div>
    </>
  );
};
