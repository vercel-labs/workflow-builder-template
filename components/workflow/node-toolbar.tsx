"use client";

import { useAtom, useSetAtom } from "jotai";
import { GitBranch, PlayCircle, Shuffle, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import {
  addNodeAtom,
  isGeneratingAtom,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store";
import { Panel } from "../ai-elements/panel";

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

const RANDOM_MULTIPLIER = 300;
const RANDOM_OFFSET = 100;

export function NodeToolbar() {
  const addNode = useSetAtom(addNodeAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);

  const handleAddNode = (template: (typeof nodeTemplates)[0]) => {
    // Generate random position - this is fine in event handlers
    const randomX = Math.random() * RANDOM_MULTIPLIER + RANDOM_OFFSET;
    const randomY = Math.random() * RANDOM_MULTIPLIER + RANDOM_OFFSET;

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
    <Panel
      className="-translate-x-[178px] flex items-center gap-1"
      position="bottom-center"
    >
      {nodeTemplates.map((template) => (
        <Button
          disabled={isGenerating}
          key={template.type}
          onClick={() => handleAddNode(template)}
          size="icon"
          title={template.label}
          variant="ghost"
        >
          <template.icon className="size-4" />
        </Button>
      ))}
    </Panel>
  );
}
