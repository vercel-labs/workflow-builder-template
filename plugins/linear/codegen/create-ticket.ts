/**
 * Code generation template for Create Ticket action
 * Used when exporting workflows to standalone Next.js projects
 */
export const createTicketCodegenTemplate = `import { LinearClient } from '@linear/sdk';

export async function createTicketStep(input: {
  ticketTitle: string;
  ticketDescription: string;
}) {
  "use step";
  
  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  
  const issue = await linear.issueCreate({
    title: input.ticketTitle,
    description: input.ticketDescription,
    teamId: process.env.LINEAR_TEAM_ID!,
  });
  
  return issue;
}`;

