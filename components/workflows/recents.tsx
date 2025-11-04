"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getRelativeTime } from "@/lib/utils/time";
import { type SavedWorkflow, workflowApi } from "@/lib/workflow-api";
import { Skeleton } from "../ui/skeleton";

type RecentsProps = {
  limit?: number;
};

export const Recents = ({ limit }: RecentsProps = {}) => {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  const loadWorkflows = useCallback(async () => {
    // Only load workflows if user is logged in
    if (!session) {
      setLoading(false);
      setWorkflows([]);
      return;
    }

    try {
      setLoading(true);
      const data = await workflowApi.getAll();
      // Filter out the auto-save workflow
      const filtered = data.filter((w) => w.name !== "__current__");
      setWorkflows(filtered);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const displayedWorkflows = limit ? workflows.slice(0, limit) : workflows;

  if (loading) {
    return (
      <div className="grid w-full gap-1">
        <Skeleton className="h-8 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    );
  }

  if (!workflows.length) {
    return null;
  }

  return (
    <div className="grid w-full gap-1">
      {displayedWorkflows.map((workflow) => (
        <div
          className="flex w-full items-center justify-between rounded-full bg-background px-3 py-1.5 text-sm"
          key={workflow.id}
        >
          <h3>{workflow.name}</h3>
          <p>{getRelativeTime(workflow.updatedAt)}</p>
        </div>
      ))}
    </div>
  );
};
