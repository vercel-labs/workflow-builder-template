"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";

export function WorkflowPrompt() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prompt.trim()) {
      return;
    }

    if (!session) {
      toast.error("Please sign in to create workflows");
      return;
    }

    setIsGenerating(true);

    try {
      // Create a new workflow (project will be auto-created with it)
      const workflow = await workflowApi.create({
        name: "Untitled Workflow",
        nodes: [],
        edges: [],
      });

      // Store the prompt for AI generation
      sessionStorage.setItem("ai-prompt", prompt);
      sessionStorage.setItem("generating-workflow-id", workflow.id);

      // Navigate to the workflow page with generating flag
      router.push(`/workflows/${workflow.id}?generating=true`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("Failed to create workflow");
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <PromptInputProvider>
        <PromptInput
          className="rounded-lg bg-background"
          globalDrop
          multiple
          onSubmit={(_message, event) => handleGenerate(event)}
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your workflow..."
              ref={textareaRef}
              value={prompt}
            />
          </PromptInputBody>
          <PromptInputFooter>
            {isGenerating && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                <span>Creating workflow...</span>
              </div>
            )}
            <PromptInputSubmit status={isGenerating ? "submitted" : "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}
