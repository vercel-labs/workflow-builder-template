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
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
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
import { ActionConfig } from "./config/action-config";
import { TriggerConfig } from "./config/trigger-config";
import { WorkflowRuns } from "./workflow-runs";

// Helper function to convert template variables to JavaScript expressions
const convertTemplateToJS = (
  template: string
): {
  convertedString: string;
  hasTemplates: boolean;
} => {
  if (!template || typeof template !== "string") {
    return { convertedString: template, hasTemplates: false };
  }

  let hasTemplates = false;

  // Match {{...}} patterns
  const pattern = /\{\{([^}]+)\}\}/g;

  const convertedString = template.replace(pattern, (match, expression) => {
    hasTemplates = true;
    const trimmed = expression.trim();

    // Check if this is a new format ID reference (starts with @)
    if (trimmed.startsWith("@")) {
      // Format: @nodeId:DisplayName or @nodeId:DisplayName.field
      const withoutAt = trimmed.substring(1);
      const colonIndex = withoutAt.indexOf(":");

      if (colonIndex === -1) {
        return match; // Invalid format, keep original
      }

      const nodeId = withoutAt.substring(0, colonIndex);
      const rest = withoutAt.substring(colonIndex + 1);

      // Check if there's a field accessor after the display name
      const dotIndex = rest.indexOf(".");
      const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

      // Handle special case: {{@nodeId:DisplayName}} (entire output)
      if (!fieldPath) {
        return `\${input.outputs?.['${nodeId}']?.data}`;
      }

      // Parse field path like "field.nested" or "items[0]"
      const accessPath = fieldPath
        .split(".")
        .map((part: string) => {
          // Handle array access
          const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
          if (arrayMatch) {
            return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
          }
          return `?.${part}`;
        })
        .join("");

      return `\${input.outputs?.['${nodeId}']?.data${accessPath}}`;
    }
    // Check if this is a legacy node ID reference (starts with $)
    if (trimmed.startsWith("$")) {
      const withoutDollar = trimmed.substring(1);

      // Handle special case: {{$nodeId}} (entire output)
      if (!(withoutDollar.includes(".") || withoutDollar.includes("["))) {
        return `\${input.outputs?.['${withoutDollar}']?.data}`;
      }

      // Parse expression like "$nodeId.field.nested"
      const parts = withoutDollar.split(".");
      const nodeId = parts[0];
      const fieldPath = parts.slice(1).join(".");

      if (!fieldPath) {
        return `\${input.outputs?.['${nodeId}']?.data}`;
      }

      const accessPath = fieldPath
        .split(".")
        .map((part: string) => {
          const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
          if (arrayMatch) {
            return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
          }
          return `?.${part}`;
        })
        .join("");

      return `\${input.outputs?.['${nodeId}']?.data${accessPath}}`;
    }
    // Legacy label-based references - not ideal but keep for compatibility
    // Just wrap in a generic access pattern
    return `\${input.outputs?.['${trimmed.replace(/\./g, "']?.data?.")}']}`;
  });

  return { convertedString, hasTemplates };
};

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
    .split(WORD_SPLIT_REGEX)
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
        const emailTo =
          (node.data.config?.emailTo as string) || "user@example.com";
        const emailSubject =
          (node.data.config?.emailSubject as string) || "Subject";
        const emailBody =
          (node.data.config?.emailBody as string) || "Email content";
        const { convertedString: convertedTo, hasTemplates: hasToTemplates } =
          convertTemplateToJS(emailTo);
        const {
          convertedString: convertedSubject,
          hasTemplates: hasSubjectTemplates,
        } = convertTemplateToJS(emailSubject);
        const {
          convertedString: convertedBody,
          hasTemplates: hasBodyTemplates,
        } = convertTemplateToJS(emailBody);

        if (hasToTemplates || hasSubjectTemplates || hasBodyTemplates) {
          lines.push("  // Send email with dynamic values");
          if (hasToTemplates) lines.push(`  const to = \`${convertedTo}\`;`);
          if (hasSubjectTemplates)
            lines.push(`  const subject = \`${convertedSubject}\`;`);
          if (hasBodyTemplates)
            lines.push(`  const body = \`${convertedBody}\`;`);
          lines.push("  const result = await sendEmail({");
          lines.push(hasToTemplates ? "    to," : `    to: "${emailTo}",`);
          lines.push(
            hasSubjectTemplates
              ? "    subject,"
              : `    subject: "${emailSubject}",`
          );
          lines.push(
            hasBodyTemplates ? "    body," : `    body: "${emailBody}",`
          );
        } else {
          lines.push("  const result = await sendEmail({");
          lines.push(`    to: "${emailTo}",`);
          lines.push(`    subject: "${emailSubject}",`);
          lines.push(`    body: "${emailBody}",`);
        }
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
        const slackChannel =
          (node.data.config?.slackChannel as string) || "#general";
        const slackMessage =
          (node.data.config?.slackMessage as string) || "Message content";
        const {
          convertedString: convertedChannel,
          hasTemplates: hasChannelTemplates,
        } = convertTemplateToJS(slackChannel);
        const {
          convertedString: convertedMessage,
          hasTemplates: hasMessageTemplates,
        } = convertTemplateToJS(slackMessage);

        if (hasChannelTemplates || hasMessageTemplates) {
          lines.push("  // Send Slack message with dynamic values");
          if (hasChannelTemplates)
            lines.push(`  const channel = \`${convertedChannel}\`;`);
          if (hasMessageTemplates)
            lines.push(`  const text = \`${convertedMessage}\`;`);
          lines.push("  const result = await sendSlackMessage({");
          lines.push(
            hasChannelTemplates
              ? "    channel,"
              : `    channel: "${slackChannel}",`
          );
          lines.push(
            hasMessageTemplates ? "    text," : `    text: "${slackMessage}",`
          );
        } else {
          lines.push("  const result = await sendSlackMessage({");
          lines.push(`    channel: "${slackChannel}",`);
          lines.push(`    text: "${slackMessage}",`);
        }
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Slack message sent:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Database Query" ||
        node.data.label.toLowerCase().includes("database")
      ) {
        const dbQuery =
          (node.data.config?.dbQuery as string) || "SELECT * FROM users";
        const { convertedString: convertedQuery, hasTemplates } =
          convertTemplateToJS(dbQuery);

        if (hasTemplates) {
          lines.push("  // Execute database query with dynamic values");
          lines.push(`  const query = \`${convertedQuery}\`;`);
          lines.push("  const result = await executeQuery({");
          lines.push("    query,");
          lines.push("  });");
        } else {
          lines.push("  // Execute database query");
          lines.push("  const result = await executeQuery({");
          lines.push(`    query: \`${dbQuery}\`,`);
          lines.push("  });");
        }
        lines.push("");
        lines.push(`  console.log('Database query completed:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Generate Text" ||
        node.data.label.toLowerCase().includes("generate text")
      ) {
        const aiPrompt =
          (node.data.config?.aiPrompt as string) || "Generate a summary";
        const aiModel = (node.data.config?.aiModel as string) || "gpt-4o-mini";
        const aiFormat = (node.data.config?.aiFormat as string) || "text";
        const { convertedString: convertedPrompt, hasTemplates } =
          convertTemplateToJS(aiPrompt);

        lines.push("  // Generate text using AI");
        if (hasTemplates) {
          lines.push(`  const prompt = \`${convertedPrompt}\`;`);
          lines.push("  const result = await generateText({");
          lines.push(`    model: "${aiModel}",`);
          lines.push("    prompt,");
        } else {
          lines.push("  const result = await generateText({");
          lines.push(`    model: "${aiModel}",`);
          lines.push(`    prompt: \`${aiPrompt}\`,`);
        }
        if (aiFormat === "object") {
          lines.push(`    format: "object",`);
        }
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Text generated:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Generate Image" ||
        node.data.label.toLowerCase().includes("generate image")
      ) {
        const imagePrompt =
          (node.data.config?.imagePrompt as string) || "A beautiful landscape";
        const imageModel =
          (node.data.config?.imageModel as string) || "openai/dall-e-3";
        const { convertedString: convertedPrompt, hasTemplates } =
          convertTemplateToJS(imagePrompt);

        lines.push("  // Generate image using AI");
        if (hasTemplates) {
          lines.push(`  const prompt = \`${convertedPrompt}\`;`);
          lines.push("  const result = await generateImage({");
          lines.push(`    model: "${imageModel}",`);
          lines.push("    prompt,");
        } else {
          lines.push("  const result = await generateImage({");
          lines.push(`    model: "${imageModel}",`);
          lines.push(`    prompt: \`${imagePrompt}\`,`);
        }
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Image generated:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Execute Code" ||
        node.data.label.toLowerCase().includes("execute code")
      ) {
        const code =
          (node.data.config?.code as string) || "return { result: 'success' }";
        const codeLanguage =
          (node.data.config?.codeLanguage as string) || "javascript";
        lines.push(`  // Execute ${codeLanguage} code`);
        lines.push("  const result = await executeCode({");
        lines.push(`    language: "${codeLanguage}",`);
        lines.push(`    code: \`${code}\`,`);
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Code executed:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Create Ticket" ||
        node.data.label.toLowerCase().includes("ticket")
      ) {
        const ticketTitle =
          (node.data.config?.ticketTitle as string) || "Bug report";
        const ticketDescription =
          (node.data.config?.ticketDescription as string) ||
          "Issue description";
        const {
          convertedString: convertedTitle,
          hasTemplates: hasTitleTemplates,
        } = convertTemplateToJS(ticketTitle);
        const {
          convertedString: convertedDescription,
          hasTemplates: hasDescriptionTemplates,
        } = convertTemplateToJS(ticketDescription);

        if (hasTitleTemplates || hasDescriptionTemplates) {
          lines.push("  // Create ticket with dynamic values");
          if (hasTitleTemplates)
            lines.push(`  const title = \`${convertedTitle}\`;`);
          if (hasDescriptionTemplates)
            lines.push(`  const description = \`${convertedDescription}\`;`);
          lines.push("  const result = await createTicket({");
          lines.push(
            hasTitleTemplates ? "    title," : `    title: "${ticketTitle}",`
          );
          lines.push(
            hasDescriptionTemplates
              ? "    description,"
              : `    description: "${ticketDescription}",`
          );
          lines.push("    priority: 2,");
        } else {
          lines.push("  const result = await createTicket({");
          lines.push(`    title: "${ticketTitle}",`);
          lines.push(`    description: "${ticketDescription}",`);
          lines.push("    priority: 2,");
        }
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Ticket created:', result);`);
        lines.push("  return result;");
      } else if (
        actionType === "Find Issues" ||
        node.data.label.toLowerCase().includes("find issues")
      ) {
        lines.push("  const result = await findIssues({");
        lines.push(`    assigneeId: "user-id",`);
        lines.push(`    status: "in_progress",`);
        lines.push("  });");
        lines.push("");
        lines.push(`  console.log('Issues found:', result);`);
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
      const { convertedString: convertedCondition, hasTemplates } =
        convertTemplateToJS(condition);

      lines.push("  // Evaluate condition");
      if (hasTemplates) {
        // Convert template string to actual JS expression that accesses the values
        // Remove the template literal backticks and ${ } wrappers to get raw JS
        const jsExpression = convertedCondition
          .replace(/\$\{/g, "(")
          .replace(/\}/g, ")");
        lines.push(`  const result = ${jsExpression};`);
      } else {
        lines.push(`  const result = ${condition};`);
      }
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

    default:
      lines.push("  // No implementation for this node type");
      lines.push("  return input;");
      break;
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
              <div className="space-y-2">
                <Label htmlFor="condition">Condition Expression</Label>
                <TemplateBadgeInput
                  disabled={isGenerating}
                  id="condition"
                  onChange={(value) => handleUpdateConfig("condition", value)}
                  placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
                  value={(selectedNode.data.config?.condition as string) || ""}
                />
                <p className="text-muted-foreground text-xs">
                  Enter a JavaScript expression that evaluates to true or false.
                  You can use @ to reference previous node outputs.
                </p>
              </div>
            )}

            {selectedNode.data.type === "transform" && (
              <div className="space-y-2">
                <Label htmlFor="transformType">Transform Type</Label>
                <TemplateBadgeInput
                  disabled={isGenerating}
                  id="transformType"
                  onChange={(value) =>
                    handleUpdateConfig("transformType", value)
                  }
                  placeholder="e.g., Map Data, Filter, Aggregate or {{NodeName.type}}"
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

// Regex for splitting camel case - defined at top level
const WORD_SPLIT_REGEX = /\s+/;

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
