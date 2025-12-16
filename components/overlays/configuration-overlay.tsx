"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Code,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FileCode,
  Play,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmOverlay } from "@/components/overlays/confirm-overlay";
import { SmartOverlayHeader } from "@/components/overlays/overlay-header";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { integrationsAtom } from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { generateWorkflowCode } from "@/lib/workflow-codegen";
import {
  clearNodeStatusesAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  deleteEdgeAtom,
  deleteNodeAtom,
  edgesAtom,
  isGeneratingAtom,
  isWorkflowOwnerAtom,
  newlyCreatedNodeIdAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  selectedEdgeAtom,
  selectedNodeAtom,
  showClearDialogAtom,
  showDeleteDialogAtom,
  updateNodeDataAtom,
} from "@/lib/workflow-store";
import { findActionById } from "@/plugins";
import { ActionConfig } from "../workflow/config/action-config";
import { ActionGrid } from "../workflow/config/action-grid";
import { TriggerConfig } from "../workflow/config/trigger-config";
import { generateNodeCode } from "../workflow/utils/code-generators";
import { WorkflowRuns } from "../workflow/workflow-runs";
import type { OverlayComponentProps } from "./types";

// System actions that need integrations (not in plugin registry)
const SYSTEM_ACTION_INTEGRATIONS: Record<string, IntegrationType> = {
  "Database Query": "database",
};

type ConfigurationOverlayProps = OverlayComponentProps;

export function ConfigurationOverlay({ overlayId }: ConfigurationOverlayProps) {
  const { push, closeAll } = useOverlay();
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [selectedEdgeId] = useAtom(selectedEdgeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [currentWorkflowName, setCurrentWorkflowName] = useAtom(
    currentWorkflowNameAtom
  );
  const isOwner = useAtomValue(isWorkflowOwnerAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const deleteEdge = useSetAtom(deleteEdgeAtom);
  const clearNodeStatuses = useSetAtom(clearNodeStatusesAtom);
  const setShowClearDialog = useSetAtom(showClearDialogAtom);
  const setShowDeleteDialog = useSetAtom(showDeleteDialogAtom);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useAtom(
    newlyCreatedNodeIdAtom
  );
  const [activeTab, setActiveTab] = useAtom(propertiesPanelActiveTabAtom);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRunsRef = useRef<(() => Promise<void>) | null>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);

  // Auto-fix invalid integration references
  const globalIntegrations = useAtomValue(integrationsAtom);
  useEffect(() => {
    if (!(selectedNode && isOwner)) return;

    const actionType = selectedNode.data.config?.actionType as
      | string
      | undefined;
    const currentIntegrationId = selectedNode.data.config?.integrationId as
      | string
      | undefined;

    if (!(actionType && currentIntegrationId)) return;

    const action = findActionById(actionType);
    const integrationType: IntegrationType | undefined =
      (action?.integration as IntegrationType | undefined) ||
      SYSTEM_ACTION_INTEGRATIONS[actionType];

    if (!integrationType) return;

    const validIntegrations = globalIntegrations.filter(
      (i) => i.type === integrationType
    );
    const isValid = validIntegrations.some(
      (i) => i.id === currentIntegrationId
    );

    if (!isValid && validIntegrations.length > 0) {
      updateNodeData({
        id: selectedNode.id,
        data: {
          config: {
            ...selectedNode.data.config,
            integrationId: validIntegrations[0].id,
          },
        },
      });
    }
  }, [selectedNode, globalIntegrations, isOwner, updateNodeData]);

  const handleUpdateConfig = useCallback(
    (key: string, value: string) => {
      if (!selectedNode) return;
      updateNodeData({
        id: selectedNode.id,
        data: {
          config: { ...selectedNode.data.config, [key]: value },
        },
      });
    },
    [selectedNode, updateNodeData]
  );

  const handleUpdateLabel = useCallback(
    (label: string) => {
      if (!selectedNode) return;
      updateNodeData({ id: selectedNode.id, data: { label } });
    },
    [selectedNode, updateNodeData]
  );

  const handleUpdateDescription = useCallback(
    (description: string) => {
      if (!selectedNode) return;
      updateNodeData({ id: selectedNode.id, data: { description } });
    },
    [selectedNode, updateNodeData]
  );

  const handleToggleEnabled = useCallback(() => {
    if (!selectedNode) return;
    updateNodeData({
      id: selectedNode.id,
      data: { enabled: selectedNode.data.enabled === false },
    });
  }, [selectedNode, updateNodeData]);

  const handleDeleteNode = useCallback(() => {
    push(ConfirmOverlay, {
      title: "Delete Node",
      message:
        "Are you sure you want to delete this node? This action cannot be undone.",
      confirmLabel: "Delete",
      confirmVariant: "destructive" as const,
      onConfirm: () => {
        if (selectedNode) {
          deleteNode(selectedNode.id);
          closeAll();
        }
      },
    });
  }, [selectedNode, deleteNode, closeAll, push]);

  const handleCopyCode = useCallback(() => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(generateNodeCode(selectedNode));
    toast.success("Code copied to clipboard");
  }, [selectedNode]);

  const handleRefreshRuns = async () => {
    if (refreshRunsRef.current) {
      setIsRefreshing(true);
      await refreshRunsRef.current();
      setIsRefreshing(false);
    }
  };

  const handleDeleteAllRuns = () => {
    push(ConfirmOverlay, {
      title: "Delete All Runs",
      message:
        "Are you sure you want to delete all workflow runs? This action cannot be undone.",
      confirmLabel: "Delete",
      confirmVariant: "destructive" as const,
      onConfirm: async () => {
        if (!currentWorkflowId) return;
        try {
          await api.workflow.deleteExecutions(currentWorkflowId);
          clearNodeStatuses();
          if (refreshRunsRef.current) {
            await refreshRunsRef.current();
          }
          toast.success("All runs deleted");
        } catch (error) {
          console.error("Failed to delete runs:", error);
          toast.error("Failed to delete runs");
        }
      },
    });
  };

  if (!selectedNode) {
    return null;
  }

  // Determine which tabs to show
  const showCodeTab =
    (selectedNode.data.type !== "trigger" ||
      (selectedNode.data.config?.triggerType as string) !== "Manual") &&
    selectedNode.data.config?.actionType !== "Condition";

  // Get current tab title
  const getTabTitle = () => {
    if (!selectedNode) {
      // For workflow view, validate the tab
      const validTab =
        activeTab === "properties" ||
        activeTab === "code" ||
        (activeTab === "runs" && isOwner)
          ? activeTab
          : "properties";
      switch (validTab) {
        case "properties":
          return "Workflow";
        case "code":
          return "Code";
        case "runs":
          return "Runs";
        default:
          return "Workflow";
      }
    }
    switch (activeTab) {
      case "properties":
        return "Properties";
      case "code":
        return "Code";
      case "runs":
        return "Runs";
      default:
        return "Properties";
    }
  };

  // Handle updating workflow name
  const handleUpdateWorkflowName = async (newName: string) => {
    setCurrentWorkflowName(newName);

    if (currentWorkflowId) {
      try {
        await api.workflow.update(currentWorkflowId, { name: newName });
      } catch (error) {
        console.error("Failed to update workflow name:", error);
      }
    }
  };

  // Handle clear workflow
  const handleClearWorkflow = () => {
    closeAll();
    setShowClearDialog(true);
  };

  // Handle delete workflow
  const handleDeleteWorkflow = () => {
    closeAll();
    setShowDeleteDialog(true);
  };

  // Generate full workflow code
  const workflowCode = (() => {
    const baseName = currentWorkflowName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join("");
    const functionName = `${baseName}Workflow`;
    const { code } = generateWorkflowCode(nodes, edges, { functionName });
    return code;
  })();

  // Handle copy workflow code
  const handleCopyWorkflowCode = () => {
    navigator.clipboard.writeText(workflowCode);
    toast.success("Code copied to clipboard");
  };

  // Handle delete edge
  const handleDeleteEdge = () => {
    if (selectedEdgeId) {
      push(ConfirmOverlay, {
        title: "Delete Connection",
        message:
          "Are you sure you want to delete this connection? This action cannot be undone.",
        confirmLabel: "Delete",
        confirmVariant: "destructive" as const,
        onConfirm: () => {
          deleteEdge(selectedEdgeId);
          closeAll();
        },
      });
    }
  };

  // If an edge is selected, show edge properties
  if (selectedEdge && !selectedNode) {
    return (
      <div className="flex h-full max-h-[80vh] flex-col">
        <SmartOverlayHeader overlayId={overlayId} title="Connection" />

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pt-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="edge-id">Connection ID</Label>
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
          {isOwner && (
            <div className="pt-2">
              <Button onClick={handleDeleteEdge} variant="ghost">
                <Trash2 className="mr-2 size-4" />
                Delete Connection
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If no node is selected, show workflow-level configuration
  if (!selectedNode) {
    // For workflow view, only properties, code, and runs (if owner) are valid tabs
    const validWorkflowTab =
      activeTab === "properties" ||
      activeTab === "code" ||
      (activeTab === "runs" && isOwner)
        ? activeTab
        : "properties";

    return (
      <div className="flex h-full max-h-[80vh] flex-col">
        <SmartOverlayHeader overlayId={overlayId} title={getTabTitle()} />

        <div className="flex-1 overflow-y-auto">
          {validWorkflowTab === "properties" && (
            <div className="space-y-4 px-6 pt-4 pb-6">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  disabled={!isOwner}
                  id="workflow-name"
                  onChange={(e) => handleUpdateWorkflowName(e.target.value)}
                  value={currentWorkflowName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-id">Workflow ID</Label>
                <Input
                  disabled
                  id="workflow-id"
                  value={currentWorkflowId || "Not saved"}
                />
              </div>
              {!isOwner && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3">
                  <p className="text-muted-foreground text-sm">
                    You are viewing a public workflow. Duplicate it to make
                    changes.
                  </p>
                </div>
              )}
              {isOwner && (
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleClearWorkflow} variant="ghost">
                    <Eraser className="mr-2 size-4" />
                    Clear
                  </Button>
                  <Button onClick={handleDeleteWorkflow} variant="ghost">
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}

          {validWorkflowTab === "code" && (
            <div className="flex flex-col">
              <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="size-3.5 text-muted-foreground" />
                  <code className="text-muted-foreground text-xs">
                    workflow.ts
                  </code>
                </div>
                <Button
                  className="h-7 text-xs"
                  onClick={handleCopyWorkflowCode}
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="mr-1 size-3" />
                  Copy
                </Button>
              </div>
              <div className="h-[400px]">
                <CodeEditor
                  defaultLanguage="typescript"
                  height="100%"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    wordWrap: "on",
                  }}
                  value={workflowCode}
                />
              </div>
            </div>
          )}

          {validWorkflowTab === "runs" && isOwner && (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
                <Button
                  className="text-muted-foreground"
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
                  className="text-muted-foreground"
                  onClick={handleDeleteAllRuns}
                  size="icon"
                  variant="ghost"
                >
                  <Eraser className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <WorkflowRuns
                  isActive={validWorkflowTab === "runs"}
                  onRefreshRef={refreshRunsRef}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom tab navigation */}
        <div className="flex shrink-0 items-center justify-around border-t bg-background pb-safe">
          <button
            className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
              validWorkflowTab === "properties"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("properties")}
            type="button"
          >
            <Settings2 className="size-5" />
            Workflow
          </button>
          <button
            className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
              validWorkflowTab === "code"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("code")}
            type="button"
          >
            <Code className="size-5" />
            Code
          </button>
          {isOwner && (
            <button
              className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
                validWorkflowTab === "runs"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("runs")}
              type="button"
            >
              <Play className="size-5" />
              Runs
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[80vh] flex-col">
      {/* Header with current tab name */}
      <SmartOverlayHeader overlayId={overlayId} title={getTabTitle()} />

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "properties" && (
          <div className="space-y-4 px-6 pt-4 pb-6">
            {/* Action selection */}
            {selectedNode.data.type === "action" &&
              !selectedNode.data.config?.actionType &&
              isOwner && (
                <ActionGrid
                  disabled={isGenerating}
                  isNewlyCreated={selectedNode?.id === newlyCreatedNodeId}
                  onSelectAction={(actionType) => {
                    handleUpdateConfig("actionType", actionType);
                    if (selectedNode?.id === newlyCreatedNodeId) {
                      setNewlyCreatedNodeId(null);
                    }
                  }}
                />
              )}

            {selectedNode.data.type === "trigger" && (
              <TriggerConfig
                config={selectedNode.data.config || {}}
                disabled={isGenerating || !isOwner}
                onUpdateConfig={handleUpdateConfig}
                workflowId={currentWorkflowId ?? undefined}
              />
            )}

            {selectedNode.data.type === "action" &&
              selectedNode.data.config?.actionType !== undefined && (
                <ActionConfig
                  config={selectedNode.data.config || {}}
                  disabled={isGenerating || !isOwner}
                  isOwner={isOwner}
                  onUpdateConfig={handleUpdateConfig}
                />
              )}

            {/* Label & Description */}
            {(selectedNode.data.type !== "action" ||
              selectedNode.data.config?.actionType !== undefined) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    disabled={isGenerating || !isOwner}
                    id="label"
                    onChange={(e) => handleUpdateLabel(e.target.value)}
                    value={selectedNode.data.label as string}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    disabled={isGenerating || !isOwner}
                    id="description"
                    onChange={(e) => handleUpdateDescription(e.target.value)}
                    placeholder="Optional description"
                    value={(selectedNode.data.description as string) || ""}
                  />
                </div>
              </>
            )}

            {/* Actions */}
            {isOwner && (
              <div className="flex items-center gap-2 pt-2">
                {selectedNode.data.type === "action" && (
                  <Button
                    className="text-muted-foreground"
                    onClick={handleToggleEnabled}
                    size="sm"
                    variant="ghost"
                  >
                    {selectedNode.data.enabled === false ? (
                      <>
                        <EyeOff className="mr-2 size-4" />
                        Disabled
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 size-4" />
                        Enabled
                      </>
                    )}
                  </Button>
                )}
                <Button
                  className="text-muted-foreground"
                  onClick={handleDeleteNode}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Preload Code tab - always render but hide when not active */}
        {showCodeTab && (
          <div
            className={`flex flex-col ${activeTab === "code" ? "" : "invisible absolute -z-10"}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <FileCode className="size-3.5 text-muted-foreground" />
                <code className="text-muted-foreground text-xs">
                  {selectedNode.data.type === "trigger"
                    ? (selectedNode.data.config?.triggerType as string) ===
                      "Schedule"
                      ? "vercel.json"
                      : `app/api${(selectedNode.data.config?.webhookPath as string) || "/webhook"}/route.ts`
                    : `steps/${(
                        (selectedNode.data.config?.actionType as string) ||
                        "action"
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")}-step.ts`}
                </code>
              </div>
              <Button
                className="text-muted-foreground"
                onClick={handleCopyCode}
                size="sm"
                variant="ghost"
              >
                <Copy className="mr-2 size-4" />
                Copy
              </Button>
            </div>
            <div className="h-[400px]">
              <CodeEditor
                height="100%"
                language={
                  selectedNode.data.type === "trigger" &&
                  (selectedNode.data.config?.triggerType as string) ===
                    "Schedule"
                    ? "json"
                    : "typescript"
                }
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
          </div>
        )}

        {activeTab === "runs" && isOwner && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
              <Button
                className="text-muted-foreground"
                disabled={isRefreshing}
                onClick={handleRefreshRuns}
                size="sm"
                variant="ghost"
              >
                <RefreshCw
                  className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                className="text-muted-foreground"
                onClick={handleDeleteAllRuns}
                size="sm"
                variant="ghost"
              >
                <Eraser className="mr-2 size-4" />
                Clear All
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <WorkflowRuns
                isActive={activeTab === "runs"}
                onRefreshRef={refreshRunsRef}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab navigation */}
      <div className="flex shrink-0 items-center justify-around border-t bg-background pb-safe">
        <button
          className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
            activeTab === "properties"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("properties")}
          type="button"
        >
          <Settings2 className="size-5" />
          Properties
        </button>
        {showCodeTab && (
          <button
            className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
              activeTab === "code" ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("code")}
            type="button"
          >
            <Code className="size-5" />
            Code
          </button>
        )}
        {isOwner && (
          <button
            className={`flex flex-1 flex-col items-center gap-1 py-3 font-medium text-xs transition-colors ${
              activeTab === "runs" ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("runs")}
            type="button"
          >
            <Play className="size-5" />
            Runs
          </button>
        )}
      </div>
    </div>
  );
}
