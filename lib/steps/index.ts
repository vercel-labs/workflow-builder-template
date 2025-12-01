/**
 * Step registry - maps action types to executable step functions
 * This allows the workflow executor to call step functions directly
 * without code generation or eval()
 */

import type { generateImageStep } from "../../plugins/ai-gateway/steps/generate-image";
import type { generateTextStep } from "../../plugins/ai-gateway/steps/generate-text";
import type { firecrawlScrapeStep } from "../../plugins/firecrawl/steps/scrape";
import type { firecrawlSearchStep } from "../../plugins/firecrawl/steps/search";
import type { createTicketStep } from "../../plugins/linear/steps/create-ticket";
import type { sendEmailStep } from "../../plugins/resend/steps/send-email";
import type { sendSlackMessageStep } from "../../plugins/slack/steps/send-slack-message";
import type { conditionStep } from "./condition";
import type { databaseQueryStep } from "./database-query";
import type { httpRequestStep } from "./http-request";

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
    (await import("../../plugins/resend/steps/send-email")).sendEmailStep(
      input as Parameters<typeof sendEmailStep>[0]
    ),
  "Send Slack Message": async (input) =>
    (
      await import("../../plugins/slack/steps/send-slack-message")
    ).sendSlackMessageStep(input as Parameters<typeof sendSlackMessageStep>[0]),
  "Create Ticket": async (input) =>
    (await import("../../plugins/linear/steps/create-ticket")).createTicketStep(
      input as Parameters<typeof createTicketStep>[0]
    ),
  "Find Issues": async (input) =>
    (await import("../../plugins/linear/steps/create-ticket")).createTicketStep(
      input as Parameters<typeof createTicketStep>[0]
    ), // TODO: Implement separate findIssuesStep
  "Generate Text": async (input) =>
    (
      await import("../../plugins/ai-gateway/steps/generate-text")
    ).generateTextStep(input as Parameters<typeof generateTextStep>[0]),
  "Generate Image": async (input) =>
    (
      await import("../../plugins/ai-gateway/steps/generate-image")
    ).generateImageStep(input as Parameters<typeof generateImageStep>[0]),
  Scrape: async (input) =>
    (await import("../../plugins/firecrawl/steps/scrape")).firecrawlScrapeStep(
      input as Parameters<typeof firecrawlScrapeStep>[0]
    ),
  Search: async (input) =>
    (await import("../../plugins/firecrawl/steps/search")).firecrawlSearchStep(
      input as Parameters<typeof firecrawlSearchStep>[0]
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
