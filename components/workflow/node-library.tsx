"use client";

import { useSetAtom } from "jotai";
import { GitBranch, PlayCircle, Shuffle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addNodeAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store";

const nodeTemplates = [
  {
    type: "trigger" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Trigger",
    displayDescription: "Start your workflow",
    icon: PlayCircle,
    defaultConfig: { triggerType: "Manual" },
  },
  {
    type: "action" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Action",
    displayDescription: "Perform an action",
    icon: Zap,
    defaultConfig: { actionType: "HTTP Request" },
  },
  {
    type: "condition" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Condition",
    displayDescription: "Branch your workflow",
    icon: GitBranch,
    defaultConfig: { condition: "If true" },
  },
  {
    type: "transform" as WorkflowNodeType,
    label: "",
    description: "",
    displayLabel: "Transform",
    displayDescription: "Transform data",
    icon: Shuffle,
    defaultConfig: { transformType: "Map Data" },
  },
];

export function NodeLibrary() {
  const addNode = useSetAtom(addNodeAtom);

  const handleAddNode = (template: (typeof nodeTemplates)[0]) => {
    // Generate random position - this is fine in event handlers
    // eslint-disable-next-line react-hooks/purity
    const randomX = Math.random() * 300 + 100;
    // eslint-disable-next-line react-hooks/purity
    const randomY = Math.random() * 300 + 100;

    const newNode: WorkflowNode = {
      id: nanoid(),
      type: template.type,
      position: {
        x: randomX,
        y: randomY,
      },
      data: {
        label: template.label,
        description: template.description,
        type: template.type,
        config: template.defaultConfig,
        status: "idle",
      },
    };

    addNode(newNode);
  };

  return (
    <Card className="h-full w-64 rounded-none border-t-0 border-r border-b-0 border-l-0">
      <CardHeader>
        <CardTitle className="text-lg">Node Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {nodeTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              key={template.type}
              onClick={() => handleAddNode(template)}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">
                    {template.displayLabel}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {template.displayDescription}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
