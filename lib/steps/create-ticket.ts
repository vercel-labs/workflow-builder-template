/**
 * Executable step function for Create Ticket action
 */
import { LinearClient } from "@linear/sdk";

export async function createTicketStep(input: {
  ticketTitle: string;
  ticketDescription: string;
  apiKey: string;
  teamId?: string;
}) {
  "use step";

  const linear = new LinearClient({ apiKey: input.apiKey });

  // Get the first team if no teamId is provided
  let teamId = input.teamId;
  if (!teamId) {
    const teams = await linear.teams();
    const firstTeam = teams.nodes[0];
    if (!firstTeam) {
      throw new Error("No teams found in Linear workspace");
    }
    teamId = firstTeam.id;
  }

  const issuePayload = await linear.createIssue({
    title: input.ticketTitle,
    description: input.ticketDescription,
    teamId,
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
