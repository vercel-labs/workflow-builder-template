import "server-only";

import { LinearClient } from "@linear/sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { LinearCredentials } from "../credentials";

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

export type FindIssuesCoreInput = {
  linearAssigneeId?: string;
  linearTeamId?: string;
  linearStatus?: string;
  linearLabel?: string;
};

export type FindIssuesInput = StepInput &
  FindIssuesCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: FindIssuesCoreInput,
  credentials: LinearCredentials
): Promise<FindIssuesResult> {
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

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function findIssuesStep(
  input: FindIssuesInput
): Promise<FindIssuesResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "linear";
