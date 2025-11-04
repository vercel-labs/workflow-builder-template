import "server-only";
import { type Issue, LinearClient } from "@linear/sdk";

export interface CreateTicketParams {
  title: string;
  description: string;
  teamId?: string;
  priority?: number;
  labels?: string[];
  assigneeId?: string;
  apiKey: string;
}

export interface CreateTicketResult {
  status: "success" | "error";
  id?: string;
  url?: string;
  error?: string;
}

/**
 * Create a ticket in Linear
 */
export async function createTicket(
  params: CreateTicketParams
): Promise<CreateTicketResult> {
  try {
    if (!params.apiKey) {
      return {
        status: "error",
        error: "Linear API key not configured",
      };
    }

    const client = new LinearClient({ apiKey: params.apiKey });

    // Get the first team if no teamId is provided
    let teamId = params.teamId;
    if (!teamId) {
      const teams = await client.teams();
      const firstTeam = await teams.nodes[0];
      if (!firstTeam) {
        throw new Error("No teams found in Linear workspace");
      }
      teamId = firstTeam.id;
    }

    const issueInput: {
      title: string;
      description: string;
      teamId: string;
      priority?: number;
      assigneeId?: string;
      labelIds?: string[];
    } = {
      title: params.title,
      description: params.description,
      teamId,
    };

    if (params.priority) {
      issueInput.priority = params.priority;
    }

    if (params.assigneeId) {
      issueInput.assigneeId = params.assigneeId;
    }

    if (params.labels && params.labels.length > 0) {
      issueInput.labelIds = params.labels;
    }

    const issuePayload = await client.createIssue(issueInput);
    const issue = await issuePayload.issue;

    if (!issue) {
      throw new Error("Failed to create issue");
    }

    return {
      status: "success",
      id: issue.id,
      url: issue.url,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a ticket from Linear
 */
export async function getTicket(
  issueId: string,
  apiKey: string
): Promise<Issue | null> {
  try {
    if (!apiKey) {
      console.error("Linear API key not provided");
      return null;
    }

    const client = new LinearClient({ apiKey });
    const issue = await client.issue(issueId);
    return issue;
  } catch (error) {
    console.error("Error fetching Linear ticket:", error);
    return null;
  }
}

/**
 * Update a ticket in Linear
 */
export async function updateTicket(
  issueId: string,
  updates: Partial<{
    title: string;
    description: string;
    priority?: number;
    assigneeId?: string;
    labelIds?: string[];
  }>,
  apiKey: string
): Promise<CreateTicketResult> {
  try {
    if (!apiKey) {
      return {
        status: "error",
        error: "Linear API key not configured",
      };
    }

    const client = new LinearClient({ apiKey });
    const issue = await client.issue(issueId);

    if (!issue) {
      throw new Error("Issue not found");
    }

    await issue.update(updates);

    return {
      status: "success",
      id: issueId,
      url: issue.url,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface FindIssuesParams {
  assigneeId?: string;
  teamId?: string;
  status?: string;
  label?: string;
  apiKey: string;
}

export interface FindIssuesResult {
  status: "success" | "error";
  issues?: Array<{
    id: string;
    title: string;
    identifier: string;
    url: string;
    state: string;
  }>;
  count?: number;
  error?: string;
}

/**
 * Find issues in Linear
 */
export async function findIssues(
  params: FindIssuesParams
): Promise<FindIssuesResult> {
  try {
    if (!params.apiKey) {
      return {
        status: "error",
        error: "Linear API key not configured",
      };
    }

    const client = new LinearClient({ apiKey: params.apiKey });

    // Build filter object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (params.assigneeId) {
      filter.assignee = { id: { eq: params.assigneeId } };
    }

    if (params.teamId) {
      filter.team = { id: { eq: params.teamId } };
    }

    if (params.status && params.status !== "any") {
      filter.state = { name: { eq: params.status } };
    }

    // Query issues with filters
    const issues = await client.issues(filter);
    const issueNodes = await issues.nodes;

    const formattedIssues = await Promise.all(
      issueNodes.map(async (issue) => {
        const state = await issue.state;
        return {
          id: issue.id,
          title: issue.title,
          identifier: issue.identifier,
          url: issue.url,
          state: state?.name || "Unknown",
        };
      })
    );

    return {
      status: "success",
      issues: formattedIssues,
      count: formattedIssues.length,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
