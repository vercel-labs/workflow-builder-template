"use client";

import { useAtom } from "jotai";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  X,
} from "lucide-react";
import Image from "next/image";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import {
  OUTPUT_DISPLAY_CONFIGS,
  type OutputDisplayConfig,
} from "@/lib/output-display-configs";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/time";
import {
  currentWorkflowIdAtom,
  executionLogsAtom,
  selectedExecutionIdAtom,
} from "@/lib/workflow-store";
import { findActionById } from "@/plugins";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

type ExecutionLog = {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  input?: unknown;
  output?: unknown;
  error: string | null;
};

type WorkflowExecution = {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "success" | "error" | "cancelled";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  error: string | null;
};

type WorkflowRunsProps = {
  isActive?: boolean;
  onRefreshRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onStartRun?: (executionId: string) => void;
};

// Helper to get the output display config for a node type
function getOutputConfig(nodeType: string): OutputDisplayConfig | undefined {
  return OUTPUT_DISPLAY_CONFIGS[nodeType];
}

// Helper to extract the displayable value from output based on config
function getOutputDisplayValue(
  output: unknown,
  config: { type: "image" | "video" | "url"; field: string }
): string | undefined {
  if (typeof output !== "object" || output === null) {
    return;
  }
  const value = (output as Record<string, unknown>)[config.field];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return;
}

// Fallback: detect if output is a base64 image (for legacy support)
function isBase64ImageOutput(output: unknown): output is { base64: string } {
  return (
    typeof output === "object" &&
    output !== null &&
    "base64" in output &&
    typeof (output as { base64: unknown }).base64 === "string" &&
    (output as { base64: string }).base64.length > 100 // Base64 images are large
  );
}

// Helper to convert execution logs to a map by nodeId for the global atom
function createExecutionLogsMap(logs: ExecutionLog[]): Record<
  string,
  {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: "pending" | "running" | "success" | "error";
    output?: unknown;
  }
> {
  const logsMap: Record<
    string,
    {
      nodeId: string;
      nodeName: string;
      nodeType: string;
      status: "pending" | "running" | "success" | "error";
      output?: unknown;
    }
  > = {};
  for (const log of logs) {
    logsMap[log.nodeId] = {
      nodeId: log.nodeId,
      nodeName: log.nodeName,
      nodeType: log.nodeType,
      status: log.status,
      output: log.output,
    };
  }
  return logsMap;
}

// Helper to check if a string is a URL
function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Component to render JSON with clickable links
function JsonWithLinks({ data }: { data: unknown }) {
  // Use regex to find and replace URLs in the JSON string
  const jsonString = JSON.stringify(data, null, 2);

  // Split by quoted strings to preserve structure
  const parts = jsonString.split(/("https?:\/\/[^"]+"|"[^"]*")/g);

  return (
    <>
      {parts.map((part) => {
        // Check if this part is a quoted URL string
        if (part.startsWith('"') && part.endsWith('"')) {
          const innerValue = part.slice(1, -1);
          if (isUrl(innerValue)) {
            return (
              <a
                className="text-blue-500 underline hover:text-blue-400"
                href={innerValue}
                key={innerValue}
                rel="noopener noreferrer"
                target="_blank"
              >
                {part}
              </a>
            );
          }
        }
        // For non-URL parts, just render as text (no key needed for text nodes)
        return part;
      })}
    </>
  );
}

// Reusable copy button component
function CopyButton({
  data,
  isError = false,
}: {
  data: unknown;
  isError?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = isError ? String(data) : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button
      className="h-7 px-2"
      onClick={handleCopy}
      size="sm"
      type="button"
      variant="ghost"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  copyData,
  isError = false,
  externalLink,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  copyData?: unknown;
  isError?: boolean;
  externalLink?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <div>
      <div className="mb-2 flex w-full items-center justify-between">
        <button
          className="flex items-center gap-1.5"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {title}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {externalLink && (
            <Button asChild className="h-7 px-2" size="sm" variant="ghost">
              <a href={externalLink} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          {copyData !== undefined && (
            <CopyButton data={copyData} isError={isError} />
          )}
        </div>
      </div>
      {isOpen && children}
    </div>
  );
}

// Component for rendering output with rich display support
function OutputDisplay({
  output,
  input,
  actionType,
}: {
  output: unknown;
  input?: unknown;
  actionType?: string;
}) {
  // Look up action from plugin registry to get outputConfig (including custom components)
  const action = actionType ? findActionById(actionType) : undefined;
  const pluginConfig = action?.outputConfig;

  // Fall back to auto-generated config for legacy support (only built-in types)
  const builtInConfig = actionType ? getOutputConfig(actionType) : undefined;

  // Get the effective built-in config (plugin config if not component, else auto-generated)
  const effectiveBuiltInConfig =
    pluginConfig?.type !== "component" ? pluginConfig : builtInConfig;

  // Get display value for built-in types (image/video/url)
  const displayValue = effectiveBuiltInConfig
    ? getOutputDisplayValue(output, effectiveBuiltInConfig)
    : undefined;

  // Check for legacy base64 image
  const isLegacyBase64 =
    !(pluginConfig || builtInConfig) && isBase64ImageOutput(output);

  const renderRichResult = () => {
    // Priority 1: Custom component from plugin outputConfig
    if (pluginConfig?.type === "component") {
      const CustomComponent = pluginConfig.component;
      return (
        <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
          <CustomComponent input={input} output={output} />
        </div>
      );
    }

    // Priority 2: Built-in output config (image/video/url)
    if (effectiveBuiltInConfig && displayValue) {
      switch (effectiveBuiltInConfig.type) {
        case "image": {
          // Handle base64 images by adding data URI prefix if needed
          const imageSrc =
            effectiveBuiltInConfig.field === "base64" &&
            !displayValue.startsWith("data:")
              ? `data:image/png;base64,${displayValue}`
              : displayValue;
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
              <Image
                alt="Generated image"
                className="max-h-96 w-auto rounded"
                height={384}
                src={imageSrc}
                unoptimized
                width={384}
              />
            </div>
          );
        }
        case "video":
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
              <video
                className="max-h-96 w-auto rounded"
                controls
                src={displayValue}
              >
                <track kind="captions" />
              </video>
            </div>
          );
        case "url":
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50">
              <iframe
                className="h-96 w-full rounded"
                sandbox="allow-scripts allow-same-origin"
                src={displayValue}
                title="Output preview"
              />
            </div>
          );
        default:
          return null;
      }
    }

    // Fallback: legacy base64 image detection
    if (isLegacyBase64) {
      return (
        <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
          <Image
            alt="AI generated output"
            className="max-h-96 w-auto rounded"
            height={384}
            src={`data:image/png;base64,${(output as { base64: string }).base64}`}
            unoptimized
            width={384}
          />
        </div>
      );
    }

    return null;
  };

  const richResult = renderRichResult();
  const hasRichResult = richResult !== null;

  // Determine external link for URL type configs
  const externalLink =
    effectiveBuiltInConfig?.type === "url" && displayValue
      ? displayValue
      : undefined;

  return (
    <>
      {/* Always show JSON output */}
      <CollapsibleSection copyData={output} title="Output">
        <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
          <JsonWithLinks data={output} />
        </pre>
      </CollapsibleSection>

      {/* Show rich result if available */}
      {hasRichResult && (
        <CollapsibleSection
          defaultExpanded
          externalLink={externalLink}
          title="Result"
        >
          {richResult}
        </CollapsibleSection>
      )}
    </>
  );
}

// Component for rendering individual execution log entries
function ExecutionLogEntry({
  log,
  isExpanded,
  onToggle,
  getStatusIcon,
  getStatusDotClass,
  isFirst,
  isLast,
}: {
  log: ExecutionLog;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusDotClass: (status: string) => string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3" key={log.id}>
      {/* Timeline connector */}
      <div className="relative -ml-px flex flex-col items-center pt-2">
        {!isFirst && (
          <div className="absolute bottom-full h-2 w-px bg-border" />
        )}
        <div
          className={cn(
            "z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-0",
            getStatusDotClass(log.status)
          )}
        >
          {getStatusIcon(log.status)}
        </div>
        {!isLast && (
          <div className="absolute top-[calc(0.5rem+1.25rem)] bottom-0 w-px bg-border" />
        )}
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1">
        <button
          className="group w-full rounded-lg py-2 text-left transition-colors hover:bg-muted/50"
          onClick={onToggle}
          type="button"
        >
          <div className="flex items-center gap-3">
            {/* Step content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-medium text-sm transition-colors group-hover:text-foreground">
                  {log.nodeName || log.nodeType}
                </span>
              </div>
            </div>

            {log.duration && (
              <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                {Number.parseInt(log.duration, 10) < 1000
                  ? `${log.duration}ms`
                  : `${(Number.parseInt(log.duration, 10) / 1000).toFixed(2)}s`}
              </span>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="mt-2 mb-2 space-y-3 px-3">
            {log.input !== null && log.input !== undefined && (
              <CollapsibleSection copyData={log.input} title="Input">
                <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  <JsonWithLinks data={log.input} />
                </pre>
              </CollapsibleSection>
            )}
            {log.output !== null && log.output !== undefined && (
              <OutputDisplay
                actionType={log.nodeType}
                input={log.input}
                output={log.output}
              />
            )}
            {log.error && (
              <CollapsibleSection
                copyData={log.error}
                defaultExpanded
                isError
                title="Error"
              >
                <pre className="overflow-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 font-mono text-red-600 text-xs leading-relaxed">
                  {log.error}
                </pre>
              </CollapsibleSection>
            )}
            {!(log.input || log.output || log.error) && (
              <div className="rounded-lg border bg-muted/30 py-4 text-center text-muted-foreground text-xs">
                No data recorded
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowRuns({
  isActive = false,
  onRefreshRef,
  onStartRun,
}: WorkflowRunsProps) {
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [selectedExecutionId, setSelectedExecutionId] = useAtom(
    selectedExecutionIdAtom
  );
  const [, setExecutionLogs] = useAtom(executionLogsAtom);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [logs, setLogs] = useState<Record<string, ExecutionLog[]>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Track which execution we've already auto-expanded to prevent loops
  const autoExpandedExecutionRef = useRef<string | null>(null);

  const loadExecutions = useCallback(
    async (showLoading = true) => {
      if (!currentWorkflowId) {
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }
        const data = await api.workflow.getExecutions(currentWorkflowId);
        setExecutions(data as WorkflowExecution[]);
      } catch (error) {
        console.error("Failed to load executions:", error);
        setExecutions([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [currentWorkflowId]
  );

  // Expose refresh function via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = () => loadExecutions(false);
    }
  }, [loadExecutions, onRefreshRef]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  // Helper function to map node IDs to labels
  const mapNodeLabels = useCallback(
    (
      logEntries: Array<{
        id: string;
        executionId: string;
        nodeId: string;
        nodeName: string;
        nodeType: string;
        status: "pending" | "running" | "success" | "error";
        input: unknown;
        output: unknown;
        error: string | null;
        startedAt: Date;
        completedAt: Date | null;
        duration: string | null;
      }>,
      _workflow?: {
        nodes: unknown;
      }
    ): ExecutionLog[] =>
      logEntries.map((log) => ({
        id: log.id,
        nodeId: log.nodeId,
        nodeName: log.nodeName,
        nodeType: log.nodeType,
        status: log.status,
        startedAt: new Date(log.startedAt),
        completedAt: log.completedAt ? new Date(log.completedAt) : null,
        duration: log.duration,
        input: log.input,
        output: log.output,
        error: log.error,
      })),
    []
  );

  const loadExecutionLogs = useCallback(
    async (executionId: string) => {
      try {
        const data = await api.workflow.getExecutionLogs(executionId);
        const mappedLogs = mapNodeLabels(data.logs, data.execution.workflow);
        setLogs((prev) => ({
          ...prev,
          [executionId]: mappedLogs,
        }));

        // Update global execution logs atom if this is the selected execution
        if (executionId === selectedExecutionId) {
          setExecutionLogs(createExecutionLogsMap(mappedLogs));
        }
      } catch (error) {
        console.error("Failed to load execution logs:", error);
        setLogs((prev) => ({ ...prev, [executionId]: [] }));
      }
    },
    [mapNodeLabels, selectedExecutionId, setExecutionLogs]
  );

  // Notify parent when a new execution starts and auto-expand it
  useEffect(() => {
    if (executions.length === 0) {
      return;
    }

    const latestExecution = executions[0];

    // Check if this is a new running execution that we haven't auto-expanded yet
    if (
      latestExecution.status === "running" &&
      latestExecution.id !== autoExpandedExecutionRef.current
    ) {
      // Mark this execution as auto-expanded
      autoExpandedExecutionRef.current = latestExecution.id;

      // Auto-select the new running execution
      setSelectedExecutionId(latestExecution.id);

      // Auto-expand the run
      setExpandedRuns((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.add(latestExecution.id);
        return newExpanded;
      });

      // Load logs for the new execution
      loadExecutionLogs(latestExecution.id);

      // Notify parent
      if (onStartRun) {
        onStartRun(latestExecution.id);
      }
    }
  }, [executions, setSelectedExecutionId, loadExecutionLogs, onStartRun]);

  // Helper to refresh logs for a single execution
  const refreshExecutionLogs = useCallback(
    async (executionId: string) => {
      try {
        const logsData = await api.workflow.getExecutionLogs(executionId);
        const mappedLogs = mapNodeLabels(
          logsData.logs,
          logsData.execution.workflow
        );
        setLogs((prev) => ({
          ...prev,
          [executionId]: mappedLogs,
        }));

        // Update global execution logs atom if this is the selected execution
        if (executionId === selectedExecutionId) {
          setExecutionLogs(createExecutionLogsMap(mappedLogs));
        }
      } catch (error) {
        console.error(`Failed to refresh logs for ${executionId}:`, error);
      }
    },
    [mapNodeLabels, selectedExecutionId, setExecutionLogs]
  );

  // Poll for new executions when tab is active
  useEffect(() => {
    if (!(isActive && currentWorkflowId)) {
      return;
    }

    const pollExecutions = async () => {
      try {
        const data = await api.workflow.getExecutions(currentWorkflowId);
        setExecutions(data as WorkflowExecution[]);

        // Also refresh logs for expanded runs
        for (const executionId of expandedRuns) {
          await refreshExecutionLogs(executionId);
        }
      } catch (error) {
        console.error("Failed to poll executions:", error);
      }
    };

    const interval = setInterval(pollExecutions, 2000);
    return () => clearInterval(interval);
  }, [isActive, currentWorkflowId, expandedRuns, refreshExecutionLogs]);

  const toggleRun = async (executionId: string) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId);
    } else {
      newExpanded.add(executionId);
      // Load logs when expanding
      await loadExecutionLogs(executionId);
    }
    setExpandedRuns(newExpanded);
  };

  const selectRun = (executionId: string) => {
    // If already selected, deselect it
    if (selectedExecutionId === executionId) {
      setSelectedExecutionId(null);
      setExecutionLogs({});
      return;
    }

    // Select the run without toggling expansion
    setSelectedExecutionId(executionId);

    // Update global execution logs atom with logs for this execution
    const executionLogEntries = logs[executionId] || [];
    setExecutionLogs(createExecutionLogsMap(executionLogEntries));
  };

  const toggleLog = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <Check className="h-3 w-3 text-white" />;
      case "error":
        return <X className="h-3 w-3 text-white" />;
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-white" />;
      default:
        return <Clock className="h-3 w-3 text-white" />;
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      case "running":
        return "bg-blue-600";
      default:
        return "bg-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-3 rounded-lg border border-dashed p-4">
          <Play className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="font-medium text-foreground text-sm">No runs yet</div>
        <div className="mt-1 text-muted-foreground text-xs">
          Execute your workflow to see runs here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((execution, index) => {
        const isExpanded = expandedRuns.has(execution.id);
        const isSelected = selectedExecutionId === execution.id;
        const executionLogs = (logs[execution.id] || []).sort((a, b) => {
          // Sort by startedAt to ensure first to last order
          return (
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
          );
        });

        return (
          <div
            className={cn(
              "overflow-hidden rounded-lg border bg-card transition-all",
              isSelected &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            key={execution.id}
          >
            <div className="flex w-full items-center gap-3 p-4">
              <button
                className="flex size-5 shrink-0 items-center justify-center rounded-full border-0 transition-colors hover:bg-muted"
                onClick={() => toggleRun(execution.id)}
                type="button"
              >
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-0",
                    getStatusDotClass(execution.status)
                  )}
                >
                  {getStatusIcon(execution.status)}
                </div>
              </button>

              <button
                className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
                onClick={() => selectRun(execution.id)}
                type="button"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    Run #{executions.length - index}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
                  <span>{getRelativeTime(execution.startedAt)}</span>
                  {execution.duration && (
                    <>
                      <span>•</span>
                      <span className="tabular-nums">
                        {Number.parseInt(execution.duration, 10) < 1000
                          ? `${execution.duration}ms`
                          : `${(Number.parseInt(execution.duration, 10) / 1000).toFixed(2)}s`}
                      </span>
                    </>
                  )}
                  {executionLogs.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {executionLogs.length}{" "}
                        {executionLogs.length === 1 ? "step" : "steps"}
                      </span>
                    </>
                  )}
                </div>
              </button>

              <button
                className="flex shrink-0 items-center justify-center rounded p-1 transition-colors hover:bg-muted"
                onClick={() => toggleRun(execution.id)}
                type="button"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {isExpanded && (
              <div className="border-t bg-muted/20">
                {executionLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No steps recorded
                  </div>
                ) : (
                  <div className="p-4">
                    {executionLogs.map((log, logIndex) => (
                      <ExecutionLogEntry
                        getStatusDotClass={getStatusDotClass}
                        getStatusIcon={getStatusIcon}
                        isExpanded={expandedLogs.has(log.id)}
                        isFirst={logIndex === 0}
                        isLast={logIndex === executionLogs.length - 1}
                        key={log.id}
                        log={log}
                        onToggle={() => toggleLog(log.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
