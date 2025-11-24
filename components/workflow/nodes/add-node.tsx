"use client";

import type { NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddNodeData = {
  onClick?: () => void;
};

export function AddNode({ data }: NodeProps & { data?: AddNodeData }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-lg border border-border border-dashed bg-background/50 p-8 backdrop-blur-sm">
      <div className="text-center">
        <h1 className="mb-2 font-bold text-3xl">Workflow Builder Template</h1>
        <p className="text-muted-foreground text-sm">
          Powered by{" "}
          <a
            className="underline underline-offset-2 transition duration-200 ease-out hover:text-foreground"
            href="https://useworkflow.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Workflow
          </a>
          ,{" "}
          <a
            className="underline underline-offset-2 transition duration-200 ease-out hover:text-foreground"
            href="https://ai-sdk.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            AI SDK
          </a>
          ,{" "}
          <a
            className="underline underline-offset-2 transition duration-200 ease-out hover:text-foreground"
            href="https://vercel.com/ai-gateway"
            rel="noopener noreferrer"
            target="_blank"
          >
            AI Gateway
          </a>{" "}
          and{" "}
          <a
            className="underline underline-offset-2 transition duration-200 ease-out hover:text-foreground"
            href="https://ai-sdk.dev/elements"
            rel="noopener noreferrer"
            target="_blank"
          >
            AI Elements
          </a>
        </p>
      </div>
      <Button className="gap-2 shadow-lg" onClick={data.onClick} size="default">
        <Plus className="size-4" />
        Add a Step
      </Button>
    </div>
  );
}
