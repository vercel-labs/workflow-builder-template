"use client";

import Editor from "@monaco-editor/react";
import { useAtom, useSetAtom } from "jotai";
import { MenuIcon, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
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

// Generate code snippet for a single node
const generateNodeCode = (node: {
  id: string;
  data: {
    type: string;
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  };
}): string => {
  const lines: string[] = [];

  // Convert label to camelCase function name
  const functionName = `${node.data.label
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((word, i) => {
      if (i === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("")}Step`;

  lines.push(
    `async function ${functionName}(input: Record<string, unknown> & { outputs?: Record<string, { label: string; data: unknown }> }) {`
  );
  lines.push("");
  lines.push(`  "use step";`);
  lines.push("");

  if (node.data.description) {
    lines.push(`  // ${node.data.description}`);
    lines.push("");
  }

  switch (node.data.type) {
    case "trigger":
      lines.push("  // Trigger setup");
      lines.push(`  console.log('Workflow triggered with input:', input);`);
      lines.push("  return input;");
      break;

    case "action": {
      const actionType = node.data.config?.actionType as string;
      const endpoint =
        (node.data.config?.endpoint as string) || "https://api.example.com";

      if (
        actionType === "Send Email" ||
        node.data.label.toLowerCase().includes("email")
      ) {
        lines.push("  const result = await sendEmail({");
        lines.push(`    to: "user@example.com",`);
        lines.push(`    subject: "Subject",`);
        lines.push(`    body: "Email content",`);
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Email sent:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Create Linear Issue" ||
        node.data.label.toLowerCase().includes("linear")
      ) {
        lines.push("  const issue = await createLinearIssue({");
        lines.push(`    title: "Issue title",`);
        lines.push(`    description: "Issue description",`);
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Linear issue created:', issue);`);
        lines.push("  return issue;");
      } else if (
        actionType === "Send Slack Message" ||
        node.data.label.toLowerCase().includes("slack")
      ) {
        lines.push("  const result = await sendSlackMessage({");
        lines.push(`    channel: "#general",`);
        lines.push(`    text: "Message content",`);
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Slack message sent:', result);`);
        lines.push("  return result;");
      } else {
        lines.push(`  const response = await fetch('${endpoint}', {`);
        lines.push(`    method: 'POST',`);
        lines.push("    headers: {");
        lines.push(`      'Content-Type': 'application/json'`);
        lines.push("    },");
        lines.push("    body: JSON.stringify(input),");
        lines.push("  });");
        lines.push("");
        lines.push("  const data = await response.json();");
        lines.push(`  console.log('HTTP request completed:', data);`);
        lines.push("  return data;");
      }
      break;
    }

    case "condition": {
      const condition = (node.data.config?.condition as string) || "true";
      lines.push("  // Evaluate condition");
      lines.push(`  const result = ${condition};`);
      lines.push("");
      lines.push(`  console.log('Condition evaluated:', result);`);
      lines.push("  return { condition: result };");
      break;
    }

    case "transform": {
      const transformType =
        (node.data.config?.transformType as string) || "Map Data";
      lines.push(`  // Transform: ${transformType}`);
      lines.push("  const transformed = {");
      lines.push("    ...input,");
      lines.push("    // Add your transformation logic here");
      lines.push("  };");
      lines.push("");
      lines.push(`  console.log('Data transformed:', transformed);`);
      lines.push("  return transformed;");
      break;
    }
  }

  lines.push("}");

  return lines.join("\n");
};

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
  const { theme } = useTheme();

  const handleCopyCode = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(generateNodeCode(selectedNode));
      toast.success("Code copied to clipboard");
    }
  };

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
            value="code"
          >
            Code
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
              <>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition Expression</Label>
                  <Input
                    disabled={isGenerating}
                    id="condition"
                    onChange={(e) =>
                      handleUpdateConfig("condition", e.target.value)
                    }
                    placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
                    value={
                      (selectedNode.data.config?.condition as string) || ""
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Enter a JavaScript expression that evaluates to true or
                    false. You can use template syntax like{" "}
                    <code className="rounded bg-muted px-1">
                      {"{{NodeName.field}}"}
                    </code>{" "}
                    to reference previous node outputs.
                  </p>
                </div>
              </>
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
        <TabsContent className="flex flex-col overflow-hidden" value="code">
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="typescript"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: "on",
                folding: false,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
              }}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={generateNodeCode(selectedNode)}
            />
          </div>
          <div className="shrink-0 border-t p-4">
            <Button onClick={handleCopyCode} size="sm" variant="outline">
              Copy Code
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

      <div className="absolute top-20 right-4 bottom-48 hidden w-89 flex-col rounded-lg border bg-background/80 backdrop-blur-sm md:flex">
        <PanelInner />
      </div>
    </>
  );
};
