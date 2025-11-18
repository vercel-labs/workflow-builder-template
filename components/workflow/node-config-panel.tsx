import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Copy, Eraser, MenuIcon, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { CodeEditor } from "@/components/ui/code-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workflowApi } from "@/lib/workflow-api";
import { generateWorkflowCode } from "@/lib/workflow-codegen";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  deleteEdgeAtom,
  deleteNodeAtom,
  deleteSelectedItemsAtom,
  edgesAtom,
  isGeneratingAtom,
  nodesAtom,
  selectedEdgeAtom,
  selectedNodeAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ActionConfig } from "./config/action-config";
import { ActionGrid } from "./config/action-grid";
import { TriggerConfig } from "./config/trigger-config";
import {
  generateNodeCode,
  NON_ALPHANUMERIC_REGEX,
  WORD_SPLIT_REGEX,
} from "./utils/code-generators";
import { WorkflowRuns } from "./workflow-runs";

// Multi-selection panel component
const MultiSelectionPanel = ({
  selectedNodes,
  selectedEdges,
  onDelete,
}: {
  selectedNodes: { id: string; selected?: boolean }[];
  selectedEdges: { id: string; selected?: boolean }[];
  onDelete: () => void;
}) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const nodeText = selectedNodes.length === 1 ? "node" : "nodes";
  const edgeText = selectedEdges.length === 1 ? "line" : "lines";
  const selectionParts: string[] = [];

  if (selectedNodes.length > 0) {
    selectionParts.push(`${selectedNodes.length} ${nodeText}`);
  }
  if (selectedEdges.length > 0) {
    selectionParts.push(`${selectedEdges.length} ${edgeText}`);
  }

  const selectionText = selectionParts.join(" and ");

  const handleDelete = () => {
    onDelete();
    setShowDeleteAlert(false);
  };

  return (
    <>
      <div className="flex size-full flex-col">
        <div className="h-auto w-full border-b bg-transparent p-3">
          <h2 className="font-semibold text-foreground">Properties</h2>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <div className="space-y-2">
            <Label>Selection</Label>
            <p className="text-muted-foreground text-sm">
              {selectionText} selected
            </p>
          </div>
        </div>
        <div className="shrink-0 border-t p-4">
          <Button
            onClick={() => setShowDeleteAlert(true)}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteAlert} open={showDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectionText}? This action
              cannot be undone.
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI logic with multiple conditions
const PanelInner = () => {
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [selectedEdgeId] = useAtom(selectedEdgeAtom);
  const [nodes] = useAtom(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [currentWorkflowName, setCurrentWorkflowName] = useAtom(
    currentWorkflowNameAtom
  );
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const deleteSelectedItems = useSetAtom(deleteSelectedItemsAtom);
  const setShowClearDialog = useSetAtom(showClearDialogAtom);
  const setShowDeleteDialog = useSetAtom(showDeleteDialogAtom);
  const [showDeleteNodeAlert, setShowDeleteNodeAlert] = useState(false);
  const [showDeleteEdgeAlert, setShowDeleteEdgeAlert] = useState(false);
  const [showDeleteRunsAlert, setShowDeleteRunsAlert] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRunsRef = useRef<(() => Promise<void>) | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);

  // Count multiple selections
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);
  const hasMultipleSelections = selectedNodes.length + selectedEdges.length > 1;

  // Generate workflow code
  const workflowCode = useMemo(() => {
    const baseName =
      currentWorkflowName
        .replace(NON_ALPHANUMERIC_REGEX, "")
        .split(WORD_SPLIT_REGEX)
        .map((word, i) => {
          if (i === 0) {
            return word.toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join("") || "execute";

    const functionName = `${baseName}Workflow`;

    const { code } = generateWorkflowCode(nodes, edges, { functionName });
    return code;
  }, [nodes, edges, currentWorkflowName]);

  const handleCopyCode = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(generateNodeCode(selectedNode));
    }
  };

  const handleCopyWorkflowCode = () => {
    navigator.clipboard.writeText(workflowCode);
    toast.success("Code copied to clipboard");
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      setShowDeleteNodeAlert(false);
    }
  };

  const handleDeleteEdge = () => {
    if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
      setShowDeleteEdgeAlert(false);
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

  const handleUpdateLabel = (label: string) => {
    if (selectedNode) {
      updateNodeData({ id: selectedNode.id, data: { label } });
    }
  };

  const handleUpdateDescription = (description: string) => {
    if (selectedNode) {
      updateNodeData({ id: selectedNode.id, data: { description } });
    }
  };

  const handleUpdateConfig = (key: string, value: string) => {
    if (selectedNode) {
      const newConfig = { ...selectedNode.data.config, [key]: value };
      updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
    }
  };

  const handleUpdateWorkspaceName = async (newName: string) => {
    setCurrentWorkflowName(newName);

    // Save to database if workflow exists
    if (currentWorkflowId) {
      try {
        await workflowApi.update(currentWorkflowId, {
          name: newName,
          nodes,
          edges,
        });
      } catch (error) {
        console.error("Failed to update workflow name:", error);
        toast.error("Failed to update workspace name");
      }
    }
  };

  const handleRefreshRuns = async () => {
    setIsRefreshing(true);
    try {
      if (refreshRunsRef.current) {
        await refreshRunsRef.current();
      }
    } catch (error) {
      console.error("Failed to refresh runs:", error);
      toast.error("Failed to refresh runs");
    } finally {
      setIsRefreshing(false);
    }
  };

  // If multiple items are selected, show multi-selection properties
  if (hasMultipleSelections) {
    return (
      <MultiSelectionPanel
        onDelete={deleteSelectedItems}
        selectedEdges={selectedEdges}
        selectedNodes={selectedNodes}
      />
    );
  }

  // If an edge is selected, show edge properties
  if (selectedEdge) {
    return (
      <>
        <div className="flex size-full flex-col">
          <div className="h-auto w-full border-b bg-transparent p-3">
            <h2 className="font-semibold text-foreground">Properties</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            <div className="space-y-2">
              <Label htmlFor="edge-id">Edge ID</Label>
              <Input disabled id="edge-id" value={selectedEdge.id} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edge-source">Source</Label>
              <Input disabled id="edge-source" value={selectedEdge.source} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edge-target">Target</Label>
              <Input disabled id="edge-target" value={selectedEdge.target} />
            </div>
          </div>
          <div className="shrink-0 border-t p-4">
            <Button
              onClick={() => setShowDeleteEdgeAlert(true)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <AlertDialog
          onOpenChange={setShowDeleteEdgeAlert}
          open={showDeleteEdgeAlert}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Edge</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this connection? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEdge}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // If no node is selected, show workspace properties and runs
  if (!selectedNode) {
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
            <TabsTrigger
              className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="code"
            >
              Code
            </TabsTrigger>
          </TabsList>
          <TabsContent
            className="flex flex-col overflow-hidden"
            value="properties"
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-3">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  onChange={(e) => handleUpdateWorkspaceName(e.target.value)}
                  value={currentWorkflowName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-id">Workspace ID</Label>
                <Input
                  disabled
                  id="workspace-id"
                  value={currentWorkflowId || "Not saved"}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t p-4">
              <Button
                onClick={() => setShowClearDialog(true)}
                size="icon"
                variant="ghost"
              >
                <Eraser className="size-4" />
              </Button>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </TabsContent>
          <TabsContent className="flex flex-col overflow-hidden" value="runs">
            <div className="flex-1 space-y-4 overflow-y-auto p-3">
              <WorkflowRuns onRefreshRef={refreshRunsRef} />
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t p-4">
              <Button
                disabled={isRefreshing}
                onClick={handleRefreshRuns}
                size="icon"
                variant="ghost"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                onClick={() => setShowDeleteRunsAlert(true)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </TabsContent>
          <TabsContent className="flex flex-col overflow-hidden" value="code">
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                height="100%"
                language="typescript"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: "on",
                  folding: true,
                  wordWrap: "off",
                  padding: { top: 16, bottom: 16 },
                }}
                value={workflowCode}
              />
            </div>
            <div className="shrink-0 border-t p-4">
              <Button
                onClick={handleCopyWorkflowCode}
                size="icon"
                variant="ghost"
              >
                <Copy className="size-4" />
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
      </>
    );
  }

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
            value="code"
          >
            Code
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

            {selectedNode.data.type === "action" &&
            !selectedNode.data.config?.actionType ? (
              <ActionGrid
                disabled={isGenerating}
                onSelectAction={(actionType) =>
                  handleUpdateConfig("actionType", actionType)
                }
              />
            ) : null}

            {selectedNode.data.type === "action" &&
            selectedNode.data.config?.actionType ? (
              <ActionConfig
                config={selectedNode.data.config || {}}
                disabled={isGenerating}
                onUpdateConfig={handleUpdateConfig}
              />
            ) : null}

            {selectedNode.data.type !== "action" ||
            selectedNode.data.config?.actionType ? (
              <>
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
              </>
            ) : null}
          </div>
          <div className="shrink-0 border-t p-4">
            <Button
              onClick={() => setShowDeleteNodeAlert(true)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TabsContent>
        <TabsContent className="flex flex-col overflow-hidden" value="code">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              height="100%"
              language="typescript"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: "on",
                folding: false,
                wordWrap: "off",
                padding: { top: 16, bottom: 16 },
              }}
              value={generateNodeCode(selectedNode)}
            />
          </div>
          <div className="shrink-0 border-t p-4">
            <Button onClick={handleCopyCode} size="icon" variant="ghost">
              <Copy className="size-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
  return (
    <>
      {/* Mobile: Drawer */}
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

      {/* Desktop: Docked sidebar - now resizable */}
      <div className="hidden size-full flex-col border-l bg-background md:flex">
        <PanelInner />
      </div>
    </>
  );
};
