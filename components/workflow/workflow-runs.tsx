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
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/time";
import { currentWorkflowIdAtom } from "@/lib/workflow-store";
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
};

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
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  const copyToClipboard = async (
    data: unknown,
    type: "input" | "output" | "error"
  ) => {
    try {
      const text =
        type === "error" ? String(data) : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      if (type === "input") {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else if (type === "output") {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      } else {
        setCopiedError(true);
        setTimeout(() => setCopiedError(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

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
                  <Button
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.input, "input");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {copiedInput ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
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
                  <Button
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.output, "output");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {copiedOutput ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {JSON.stringify(log.output, null, 2)}
                </pre>
              </div>
            )}
            {log.error && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Error
                  </div>
                  <Button
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.error, "error");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {copiedError ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
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
}: WorkflowRunsProps) {
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [logs, setLogs] = useState<Record<string, ExecutionLog[]>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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
          } catch (error) {
            console.error(`Failed to refresh logs for ${executionId}:`, error);
          }
        }
      } catch (error) {
        console.error("Failed to poll executions:", error);
      }
    };

    const interval = setInterval(pollExecutions, 2000);
    return () => clearInterval(interval);
  }, [isActive, currentWorkflowId, expandedRuns, mapNodeLabels]);

  const loadExecutionLogs = async (executionId: string) => {
    try {
      const data = await api.workflow.getExecutionLogs(executionId);
      const mappedLogs = mapNodeLabels(data.logs, data.execution.workflow);
      setLogs((prev) => ({
        ...prev,
        [executionId]: mappedLogs,
      }));
    } catch (error) {
      console.error("Failed to load execution logs:", error);
      setLogs((prev) => ({ ...prev, [executionId]: [] }));
    }
  };

  const toggleRun = async (executionId: string) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId);
    } else {
      newExpanded.add(executionId);
      await loadExecutionLogs(executionId);
    }
    setExpandedRuns(newExpanded);
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
        return <Check className="h-3 w-3 text-primary" />;
      case "error":
        return <X className="h-3 w-3 text-primary" />;
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      default:
        return <Clock className="h-3 w-3 text-primary" />;
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
        const executionLogs = (logs[execution.id] || []).sort((a, b) => {
          // Sort by startedAt to ensure first to last order
          return (
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
          );
        });

        return (
          <div
            className="overflow-hidden rounded-lg border bg-card"
            key={execution.id}
          >
            <button
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => toggleRun(execution.id)}
              type="button"
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-0",
                  getStatusDotClass(execution.status)
                )}
              >
                {getStatusIcon(execution.status)}
              </div>

              <div className="min-w-0 flex-1">
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
              </div>

              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

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
