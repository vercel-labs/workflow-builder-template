/**
 * Step registry - maps action types to executable step functions
 * This allows the workflow executor to call step functions directly
 * without code generation or eval()
 */

import type { conditionStep } from "./condition";
import type { createTicketStep } from "./create-ticket";
import type { databaseQueryStep } from "./database-query";
import type { generateImageStep } from "./generate-image";
import type { generateTextStep } from "./generate-text";
import type { httpRequestStep } from "./http-request";
import type { sendEmailStep } from "./send-email";
import type { sendSlackMessageStep } from "./send-slack-message";

// Step function type
export type StepFunction = (input: Record<string, unknown>) => Promise<unknown>;

// Registry of all available steps
export const stepRegistry: Record<string, StepFunction> = {
  "HTTP Request": async (input) =>
    (await import("./http-request")).httpRequestStep(
      input as Parameters<typeof httpRequestStep>[0]
    ),
  "Database Query": async (input) =>
    (await import("./database-query")).databaseQueryStep(
      input as Parameters<typeof databaseQueryStep>[0]
    ),
  Condition: async (input) =>
    (await import("./condition")).conditionStep(
      input as Parameters<typeof conditionStep>[0]
    ),
  "Send Email": async (input) =>
    (await import("./send-email")).sendEmailStep(
      input as Parameters<typeof sendEmailStep>[0]
    ),
  "Send Slack Message": async (input) =>
    (await import("./send-slack-message")).sendSlackMessageStep(
      input as Parameters<typeof sendSlackMessageStep>[0]
    ),
  "Create Ticket": async (input) =>
    (await import("./create-ticket")).createTicketStep(
      input as Parameters<typeof createTicketStep>[0]
    ),
  "Find Issues": async (input) =>
    (await import("./create-ticket")).createTicketStep(
      input as Parameters<typeof createTicketStep>[0]
    ), // TODO: Implement separate findIssuesStep
  "Generate Text": async (input) =>
    (await import("./generate-text")).generateTextStep(
      input as Parameters<typeof generateTextStep>[0]
    ),
  "Generate Image": async (input) =>
    (await import("./generate-image")).generateImageStep(
      input as Parameters<typeof generateImageStep>[0]
    ),
};

// Helper to check if a step exists
export function hasStep(actionType: string): boolean {
  return actionType in stepRegistry;
}

// Helper to get a step function
export function getStep(actionType: string): StepFunction | undefined {
  return stepRegistry[actionType];
}
