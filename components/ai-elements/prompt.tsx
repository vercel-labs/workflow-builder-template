"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom, useAtomValue } from "jotai";
import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  edgesAtom,
  isGeneratingAtom,
  nodesAtom,
  selectedNodeAtom,
} from "@/lib/workflow-store";

type AIPromptProps = {
  workflowId?: string;
  onWorkflowCreated?: (workflowId: string) => void;
};

export function AIPrompt({ workflowId, onWorkflowCreated }: AIPromptProps) {
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [prompt, setPrompt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useAtomValue(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [_nodes, setNodes] = useAtom(nodesAtom);
  const [_currentWorkflowId, setCurrentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [_currentWorkflowName, setCurrentWorkflowName] = useAtom(currentWorkflowNameAtom);
  const [_selectedNodeId, setSelectedNodeId] = useAtom(selectedNodeAtom);
  const { fitView } = useReactFlow();

  // Filter out placeholder "add" nodes to get real nodes
  const realNodes = nodes.filter((node) => node.type !== "add");
  const hasNodes = realNodes.length > 0;

  // Focus input when Cmd/Ctrl + K is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleFocus = () => {
    setIsExpanded(true);
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't collapse if focus is moving to another element within the container
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    if (!prompt.trim()) {
      setIsExpanded(false);
    }
  };

  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!prompt.trim() || isGenerating) {
        return;
      }

      setIsGenerating(true);

      try {
        // Send existing workflow data for context when modifying
        const existingWorkflow = hasNodes
          ? { nodes: realNodes, edges, name: _currentWorkflowName }
          : undefined;

        console.log("[AI Prompt] Generating workflow");
        console.log("[AI Prompt] Has nodes:", hasNodes);
        console.log("[AI Prompt] Sending existing workflow:", !!existingWorkflow);
        if (existingWorkflow) {
          console.log(
            "[AI Prompt] Existing workflow:",
            existingWorkflow.nodes.length,
            "nodes,",
            existingWorkflow.edges.length,
            "edges"
          );
        }

        // Use streaming API with incremental updates
        const workflowData = await api.ai.generateStream(
          prompt,
          (partialData) => {
            // Update UI incrementally with animated edges
            const edgesWithAnimatedType = (partialData.edges || []).map((edge) => ({
              ...edge,
              type: "animated",
            }));

            // Validate: ensure only ONE trigger node exists
            const triggerNodes = (partialData.nodes || []).filter(
              (node) => node.data?.type === "trigger"
            );

            let validEdges = edgesWithAnimatedType;

            if (triggerNodes.length > 1) {
              // Keep only the first trigger and all non-trigger nodes
              const firstTrigger = triggerNodes[0];
              const nonTriggerNodes = (partialData.nodes || []).filter(
                (node) => node.data?.type !== "trigger"
              );
              partialData.nodes = [firstTrigger, ...nonTriggerNodes];

              // Remove edges connected to removed triggers
              const removedTriggerIds = triggerNodes.slice(1).map((n) => n.id);
              validEdges = edgesWithAnimatedType.filter(
                (edge) =>
                  !removedTriggerIds.includes(edge.source) &&
                  !removedTriggerIds.includes(edge.target)
              );
            }

            // Update the canvas incrementally
            setNodes(partialData.nodes || []);
            setEdges(validEdges);
            if (partialData.name) {
              setCurrentWorkflowName(partialData.name);
            }
            // Fit view after each update to keep all nodes visible
            setTimeout(() => {
              fitView({ padding: 0.2, duration: 200 });
            }, 0);
          },
          existingWorkflow
        );

        console.log("[AI Prompt] Received final workflow data");
        console.log("[AI Prompt] Nodes:", workflowData.nodes?.length || 0);
        console.log("[AI Prompt] Edges:", workflowData.edges?.length || 0);

        // Use edges from workflow data with animated type
        const finalEdges = (workflowData.edges || []).map((edge) => ({
          ...edge,
          type: "animated",
        }));

        // Validate: check for blank/incomplete nodes
        console.log("[AI Prompt] Validating nodes:", workflowData.nodes);
        const incompleteNodes = (workflowData.nodes || []).filter((node) => {
          const nodeType = node.data?.type;
          const config = node.data?.config || {};

          console.log(`[AI Prompt] Checking node ${node.id}:`, {
            type: nodeType,
            config,
            hasActionType: !!config.actionType,
            hasTriggerType: !!config.triggerType,
          });

          // Check trigger nodes
          if (nodeType === "trigger") {
            return !config.triggerType;
          }

          // Check action nodes
          if (nodeType === "action") {
            return !config.actionType;
          }

          // Allow other node types (condition, transform) without strict validation
          return false;
        });

        if (incompleteNodes.length > 0) {
          console.error(
            "[AI Prompt] AI generated incomplete nodes:",
            incompleteNodes
          );
          console.error(
            "[AI Prompt] Full workflow data:",
            JSON.stringify(workflowData, null, 2)
          );
          throw new Error(
            `Cannot create workflow: The AI tried to create ${incompleteNodes.length} incomplete node(s). The requested action type may not be supported. Please try a different description using supported actions: Send Email, Send Slack Message, Create Ticket, Database Query, HTTP Request, Generate Text, Generate Image, Scrape, or Search.`
          );
        }

        // If no workflowId, create a new workflow
        if (!workflowId) {
          const newWorkflow = await api.workflow.create({
            name: workflowData.name || "AI Generated Workflow",
            description: workflowData.description || "",
            nodes: workflowData.nodes || [],
            edges: finalEdges,
          });

          // State already updated by streaming callback
          setCurrentWorkflowId(newWorkflow.id);

          toast.success("Created workflow");

          // Notify parent component to redirect
          if (onWorkflowCreated) {
            onWorkflowCreated(newWorkflow.id);
          }
        } else {
          setCurrentWorkflowId(workflowId);

          console.log("[AI Prompt] Updating existing workflow:", workflowId);
          console.log("[AI Prompt] Has existingWorkflow context:", !!existingWorkflow);

          // State already updated by streaming callback
          if (existingWorkflow) {
            console.log("[AI Prompt] REPLACING workflow with AI response");
            console.log(
              "[AI Prompt] Replacing",
              realNodes.length,
              "nodes with",
              workflowData.nodes?.length || 0,
              "nodes"
            );
          } else {
            console.log("[AI Prompt] Setting workflow for empty canvas");

            toast.success("Generated workflow");
          }

          const selectedNode = workflowData.nodes?.find(
            (n: { selected?: boolean }) => n.selected
          );
          if (selectedNode) {
            setSelectedNodeId(selectedNode.id);
          }

          // Save the updated workflow
          await api.workflow.update(workflowId, {
            name: workflowData.name,
            description: workflowData.description,
            nodes: workflowData.nodes,
            edges: finalEdges,
          });
        }

        // Clear and close
        setPrompt("");
        setIsExpanded(false);
        setIsFocused(false);
        inputRef.current?.blur();
      } catch (error) {
        console.error("Failed to generate workflow:", error);
        toast.error("Failed to generate workflow");
      } finally {
        setIsGenerating(false);
      }
    },
    [
      prompt,
      isGenerating,
      workflowId,
      hasNodes,
      nodes,
      edges,
      setIsGenerating,
      setCurrentWorkflowId,
      setNodes,
      setEdges,
      setCurrentWorkflowName,
      setSelectedNodeId,
      onWorkflowCreated,
      fitView,
    ]
  );

  return (
    <>
      {/* Always visible prompt input */}
      <div
        ref={containerRef}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 px-4"
        style={{
          width: isExpanded ? "min(100%, 42rem)" : "20rem",
          transition: "width 150ms ease-out",
        }}
      >
        <form
          aria-busy={isGenerating}
          aria-label="AI workflow prompt"
          className="relative flex items-center gap-2 rounded-lg border bg-background pl-3 pr-2 py-2 shadow-lg cursor-text"
          onClick={(e) => {
            // Focus textarea when clicking anywhere in the form (including padding)
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'BUTTON') {
              inputRef.current?.focus();
            }
          }}
          onMouseDown={(e) => {
            // Prevent textarea from losing focus when clicking form padding
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
          onSubmit={handleGenerate}
          role="search"
        >
          {isGenerating && prompt ? (
            <Shimmer className="flex-1 text-sm whitespace-pre-wrap" duration={2}>
              {prompt}
            </Shimmer>
          ) : (
            <textarea
              aria-label="Describe your workflow"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none h-[22px] min-h-[22px] max-h-[200px] py-0 leading-[22px]"
              disabled={isGenerating}
              onBlur={handleBlur}
              onChange={(e) => {
                setPrompt(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onFocus={handleFocus}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate(e as any);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setPrompt("");
                  setIsExpanded(false);
                  setIsFocused(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder={isFocused ? "Describe your workflow with natural language..." : "Ask AI..."}
              ref={inputRef}
              rows={1}
              value={prompt}
            />
          )}
          <div className="sr-only">
            {isGenerating ? "Generating workflow, please wait..." : ""}
          </div>
          <div className="relative size-8 shrink-0 self-end">
            <Button
              aria-label="Focus prompt input (⌘K)"
              className="absolute inset-0 h-8 px-0 text-xs text-muted-foreground hover:bg-transparent transition-[opacity,filter] ease-out"
              onClick={() => inputRef.current?.focus()}
              style={
                !prompt.trim() && !isGenerating && !isFocused
                  ? { opacity: 1, filter: "blur(0px)", pointerEvents: "auto", visibility: "visible" }
                  : { opacity: 0, filter: "blur(2px)", pointerEvents: "none", visibility: "hidden" }
              }
              type="button"
              variant="ghost"
            >
              <kbd aria-hidden="true" className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button
              aria-label={isGenerating ? "Generating workflow..." : "Generate workflow"}
              className="size-8 transition-[opacity,filter] ease-out shrink-0"
              disabled={!prompt.trim() || isGenerating}
              size="sm"
              style={
                !prompt.trim() && !isGenerating && !isFocused
                  ? { opacity: 0, filter: "blur(2px)", pointerEvents: "none", visibility: "hidden" }
                  : { opacity: 1, filter: "blur(0px)", pointerEvents: "auto", visibility: "visible" }
              }
              type="submit"
            >
              <ArrowUp aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

