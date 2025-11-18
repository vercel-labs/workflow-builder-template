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
import { getExecutionLogs } from "@/app/actions/workflow/get-execution-logs";
import { getExecutions } from "@/app/actions/workflow/get-executions";
import { getRelativeTime } from "@/lib/utils/time";
import { currentWorkflowIdAtom } from "@/lib/workflow-store";
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
};

export function WorkflowRuns({ isActive = false }: WorkflowRunsProps) {
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [logs, setLogs] = useState<Record<string, ExecutionLog[]>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkflowId) {
      setLoading(false);
      return;
    }

    const loadExecutions = async () => {
      try {
        setLoading(true);
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
    if (!(isActive && currentWorkflowId)) {
      return;
    }

    const loadExecutions = async () => {
      try {
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
    if (logs[executionId]) {
      return;
    }

    try {
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
      <div className="flex items-center justify-center">
        <Spinner />
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
            <button
              className="flex w-full cursor-pointer items-center gap-2 p-2 text-left transition-colors hover:bg-muted/50"
              onClick={() => toggleRun(execution.id)}
              type="button"
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
                      {Number.parseInt(execution.duration, 10) < 1000
                        ? `${execution.duration}ms`
                        : `${(Number.parseInt(execution.duration, 10) / 1000).toFixed(2)}s`}
                    </span>
                  )}
                </div>
                {execution.error && (
                  <div className="truncate text-red-600 text-xs">
                    {execution.error}
                  </div>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-muted border-t">
                {executionLogs.length === 0 ? (
                  <div className="px-2 py-2 text-muted-foreground text-xs">
                    No steps recorded
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {executionLogs.map((log) => {
                      const isLogExpanded = expandedLogs.has(log.id);
                      return (
                        <div className="rounded border" key={log.id}>
                          <button
                            className="w-full cursor-pointer px-2 py-1.5 text-left hover:bg-muted/30"
                            onClick={() => toggleLog(log.id)}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              {isLogExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {getStatusIcon(log.status)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-xs">
                                    {log.nodeName || log.nodeType}
                                  </span>
                                  {log.duration && (
                                    <span className="text-muted-foreground text-xs">
                                      {Number.parseInt(log.duration, 10) < 1000
                                        ? `${log.duration}ms`
                                        : `${(Number.parseInt(log.duration, 10) / 1000).toFixed(2)}s`}
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
                          </button>

                          {isLogExpanded && (
                            <div className="border-t bg-muted/20 p-2">
                              <div className="space-y-2">
                                {log.input !== null &&
                                  log.input !== undefined && (
                                    <div>
                                      <div className="mb-1 font-semibold text-xs">
                                        Input
                                      </div>
                                      <pre className="overflow-auto rounded bg-background p-2 text-xs">
                                        {JSON.stringify(log.input, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                {log.output !== null &&
                                  log.output !== undefined && (
                                    <div>
                                      <div className="mb-1 font-semibold text-xs">
                                        Output
                                      </div>
                                      <pre className="overflow-auto rounded bg-background p-2 text-xs">
                                        {JSON.stringify(log.output, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                {!(log.input || log.output || log.error) && (
                                  <div className="text-muted-foreground text-xs">
                                    No data recorded
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
