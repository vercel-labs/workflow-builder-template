import "server-only";

import { LinearClient } from "@linear/sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type CreateTicketResult =
  | { success: true; id: string; url: string; title: string }
  | { success: false; error: string };

/**
 * Create Ticket Step
 * Creates a ticket/issue in Linear
 */
export async function createTicketStep(input: {
  integrationId?: string;
  ticketTitle: string;
  ticketDescription: string;
}): Promise<CreateTicketResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.LINEAR_API_KEY;
  const teamId = credentials.LINEAR_TEAM_ID;

  if (!apiKey) {
    return {
      success: false,
      error:
        "LINEAR_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const linear = new LinearClient({ apiKey });

    let targetTeamId = teamId;
    if (!targetTeamId) {
      const teams = await linear.teams();
      const firstTeam = teams.nodes[0];
      if (!firstTeam) {
        return {
          success: false,
          error: "No teams found in Linear workspace",
        };
      }
      targetTeamId = firstTeam.id;
    }

    const issuePayload = await linear.createIssue({
      title: input.ticketTitle,
      description: input.ticketDescription,
      teamId: targetTeamId,
    });

    const issue = await issuePayload.issue;

    if (!issue) {
      return {
        success: false,
        error: "Failed to create issue",
      };
    }

    return {
      success: true,
      id: issue.id,
      url: issue.url,
      title: issue.title,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create ticket: ${getErrorMessage(error)}`,
    };
  }
}

