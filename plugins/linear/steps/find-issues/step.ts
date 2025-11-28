import "server-only";

import { LinearClient } from "@linear/sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type LinearIssue = {
  id: string;
  title: string;
  url: string;
  state: string;
  priority: number;
  assigneeId?: string;
};

type FindIssuesResult =
  | { success: true; issues: LinearIssue[]; count: number }
  | { success: false; error: string };

/**
 * Find Issues Step
 * Searches for issues in Linear based on filters
 */
export async function findIssuesStep(input: {
  integrationId?: string;
  linearAssigneeId?: string;
  linearTeamId?: string;
  linearStatus?: string;
  linearLabel?: string;
}): Promise<FindIssuesResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.LINEAR_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "LINEAR_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const linear = new LinearClient({ apiKey });

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (input.linearAssigneeId) {
      filter.assignee = { id: { eq: input.linearAssigneeId } };
    }

    if (input.linearTeamId) {
      filter.team = { id: { eq: input.linearTeamId } };
    }

    if (input.linearStatus && input.linearStatus !== "any") {
      filter.state = { name: { eqIgnoreCase: input.linearStatus } };
    }

    if (input.linearLabel) {
      filter.labels = { name: { eqIgnoreCase: input.linearLabel } };
    }

    const issues = await linear.issues({ filter });

    const mappedIssues: LinearIssue[] = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = await issue.state;
        return {
          id: issue.id,
          title: issue.title,
          url: issue.url,
          state: state?.name || "Unknown",
          priority: issue.priority,
          assigneeId: issue.assigneeId || undefined,
        };
      })
    );

    return {
      success: true,
      issues: mappedIssues,
      count: mappedIssues.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find issues: ${getErrorMessage(error)}`,
    };
  }
}

