/**
 * Executable step function for Create Ticket action
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import { LinearClient } from "@linear/sdk";
import { fetchWorkflowCredentials } from "../credential-fetcher";

export async function createTicketStep(input: {
  workflowId?: string;
  ticketTitle: string;
  ticketDescription: string;
}) {
  "use step";

  const credentials = input.workflowId
    ? await fetchWorkflowCredentials(input.workflowId)
    : {};

  const apiKey = credentials.LINEAR_API_KEY;
  const teamId = credentials.LINEAR_TEAM_ID;

  if (!apiKey) {
    throw new Error(
      "LINEAR_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const linear = new LinearClient({ apiKey });

  let targetTeamId = teamId;
  if (!targetTeamId) {
    const teams = await linear.teams();
    const firstTeam = teams.nodes[0];
    if (!firstTeam) {
      throw new Error("No teams found in Linear workspace");
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
    throw new Error("Failed to create issue");
  }

  return {
    id: issue.id,
    url: issue.url,
    title: issue.title,
  };
}
