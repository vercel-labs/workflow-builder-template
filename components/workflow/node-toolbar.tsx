"use client";

import { useAtom, useSetAtom } from "jotai";
import { GitBranch, PlayCircle, Shuffle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  addNodeAtom,
  isGeneratingAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store";

const nodeTemplates = [
  {
    type: "trigger" as WorkflowNodeType,
    label: "Trigger",
    description: "Start your workflow",
    icon: PlayCircle,
    defaultConfig: { triggerType: "Manual" },
  },
  {
    type: "action" as WorkflowNodeType,
    label: "Action",
    description: "Perform an action",
    icon: Zap,
    defaultConfig: {
      actionType: "HTTP Request",
      endpoint: "https://api.example.com",
    },
  },
  {
    type: "condition" as WorkflowNodeType,
    label: "Condition",
    description: "Branch your workflow",
    icon: GitBranch,
    defaultConfig: { condition: "If true" },
  },
  {
    type: "transform" as WorkflowNodeType,
    label: "Transform",
    description: "Transform data",
    icon: Shuffle,
    defaultConfig: { transformType: "Map Data" },
  },
];

export function NodeToolbar() {
  const addNode = useSetAtom(addNodeAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);

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
    <div className="absolute top-4 left-4 z-10 flex border bg-background shadow-lg">
      {nodeTemplates.map((template, index) => {
        const Icon = template.icon;
        return (
          <div className="flex" key={template.type}>
            <Button
              className="h-[26px] w-[26px] rounded-none p-0"
              disabled={isGenerating}
              onClick={() => handleAddNode(template)}
              size="icon"
              title={template.label}
              variant="ghost"
            >
              <Icon className="h-4 w-4" />
            </Button>
            {index < nodeTemplates.length - 1 && (
              <Separator
                className="h-[26px] bg-border"
                orientation="vertical"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
