"use client";

import { useAtom } from "jotai";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Play,
  X,
} from "lucide-react";
import Image from "next/image";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/time";
import {
  currentWorkflowIdAtom,
  executionLogsAtom,
  selectedExecutionIdAtom,
} from "@/lib/workflow-store";
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

// Helper to detect if output is a base64 image from generateImage step
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
      <div className="-ml-px relative flex flex-col items-center pt-2">
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
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Input
                  </div>
                  <CopyButton data={log.input} />
                </div>
                <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {JSON.stringify(log.input, null, 2)}
                </pre>
              </div>
            )}
            {log.output !== null && log.output !== undefined && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Output
                  </div>
                  <CopyButton data={log.output} />
                </div>
                {isBase64ImageOutput(log.output) ? (
                  <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
                    <Image
                      alt="AI generated output"
                      className="max-h-96 w-auto rounded"
                      height={384}
                      src={`data:image/png;base64,${(log.output as { base64: string }).base64}`}
                      unoptimized
                      width={384}
                    />
                  </div>
                ) : (
                  <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                    {JSON.stringify(log.output, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {log.error && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Error
                  </div>
                  <CopyButton data={log.error} isError />
                </div>
                <pre className="overflow-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 font-mono text-red-600 text-xs leading-relaxed">
                  {log.error}
                </pre>
              </div>
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
