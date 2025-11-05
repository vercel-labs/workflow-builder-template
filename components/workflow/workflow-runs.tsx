"use client";

import { useAtom } from "jotai";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getRelativeTime } from "@/lib/utils/time";
import { currentWorkflowIdAtom } from "@/lib/workflow-store";

interface ExecutionLog {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  error: string | null;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "success" | "error" | "cancelled";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  error: string | null;
}

interface WorkflowRunsProps {
  isActive?: boolean;
}

export function WorkflowRuns({ isActive = false }: WorkflowRunsProps) {
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [logs, setLogs] = useState<Record<string, ExecutionLog[]>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkflowId) {
      setLoading(false);
      return;
    }

    const loadExecutions = async () => {
      try {
        setLoading(true);
        const { getExecutions } = await import(
          "@/app/actions/workflow/get-executions"
        );
        const data = await getExecutions(currentWorkflowId);
        setExecutions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load executions:", error);
        setExecutions([]);
      } finally {
        setLoading(false);
      }
    };

    loadExecutions();
  }, [currentWorkflowId]);

  // Poll for new executions when tab is active
  useEffect(() => {
    if (!(isActive && currentWorkflowId)) return;

    const loadExecutions = async () => {
      try {
        const { getExecutions } = await import(
          "@/app/actions/workflow/get-executions"
        );
        const data = await getExecutions(currentWorkflowId);
        setExecutions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to poll executions:", error);
      }
    };

    const interval = setInterval(loadExecutions, 5000);
    return () => clearInterval(interval);
  }, [isActive, currentWorkflowId]);

  const loadExecutionLogs = async (executionId: string) => {
    if (logs[executionId]) return; // Already loaded

    try {
      const { getExecutionLogs } = await import(
        "@/app/actions/workflow/get-execution-logs"
      );
      const data = await getExecutionLogs(executionId);
      setLogs((prev) => ({
        ...prev,
        [executionId]: Array.isArray(data.logs) ? data.logs : [],
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-600" />;
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-600" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground text-xs">Loading runs...</div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground text-xs">No runs yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => {
        const isExpanded = expandedRuns.has(execution.id);
        const executionLogs = logs[execution.id] || [];

        return (
          <div className="rounded-lg border border-muted" key={execution.id}>
            <div
              className="flex w-full cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-muted/50"
              onClick={() => toggleRun(execution.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {getStatusIcon(execution.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs">
                    {getRelativeTime(execution.startedAt)}
                  </span>
                  {execution.duration && (
                    <span className="text-muted-foreground text-xs">
                      {Number.parseInt(execution.duration) < 1000
                        ? `${execution.duration}ms`
                        : `${(Number.parseInt(execution.duration) / 1000).toFixed(2)}s`}
                    </span>
                  )}
                </div>
                {execution.error && (
                  <div className="truncate text-red-600 text-xs">
                    {execution.error}
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-muted border-t">
                {executionLogs.length === 0 ? (
                  <div className="px-2 py-2 text-muted-foreground text-xs">
                    No steps recorded
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {executionLogs.map((log) => (
                      <div
                        className="rounded px-2 py-1.5 hover:bg-muted/30"
                        key={log.id}
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-xs">
                                {log.nodeName || log.nodeType}
                              </span>
                              {log.duration && (
                                <span className="text-muted-foreground text-xs">
                                  {Number.parseInt(log.duration) < 1000
                                    ? `${log.duration}ms`
                                    : `${(Number.parseInt(log.duration) / 1000).toFixed(2)}s`}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {log.nodeType}
                            </div>
                            {log.error && (
                              <div className="mt-1 text-red-600 text-xs">
                                {log.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
