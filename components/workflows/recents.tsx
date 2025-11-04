"use client";

import Link from "next/link";
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
        {new Array(limit).fill(0).map((_, index) => (
          <Skeleton className="h-[30px] w-full rounded-full" key={index} />
        ))}
      </div>
    );
  }

  if (!workflows.length) {
    return null;
  }

  return (
    <div className="grid w-full gap-1">
      {displayedWorkflows.map((workflow) => (
        <Link
          className="flex w-full items-center justify-between rounded-full border bg-background px-3 py-1.5 text-xs"
          href={`/workflows/${workflow.id}`}
          key={workflow.id}
        >
          <h3>{workflow.name}</h3>
          <p className="text-muted-foreground text-xs">
            {getRelativeTime(workflow.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
};
