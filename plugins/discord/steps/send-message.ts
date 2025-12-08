import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { DiscordCredentials } from "../credentials";

type DiscordWebhookResponse = {
  id?: string;
  type?: number;
  channel_id?: string;
  message?: string;
  code?: number;
};

type SendDiscordMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export type SendDiscordMessageCoreInput = {
  discordWebhookUrl: string;
  discordMessage: string;
};

export type SendDiscordMessageInput = StepInput &
  SendDiscordMessageCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SendDiscordMessageCoreInput,
  _credentials: DiscordCredentials
): Promise<SendDiscordMessageResult> {
  console.log("[Discord] Starting send message step");

  const webhookUrl = input.discordWebhookUrl;

  if (!webhookUrl) {
    console.error("[Discord] No webhook URL provided");
    return {
      success: false,
      error: "Discord webhook URL is required",
    };
  }

  // Validate webhook URL format
  if (!webhookUrl.includes("discord.com/api/webhooks/")) {
    console.error("[Discord] Invalid webhook URL format");
    return {
      success: false,
      error: "Invalid Discord webhook URL format",
    };
  }

  try {
    console.log("[Discord] Sending message to webhook");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: input.discordMessage,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as DiscordWebhookResponse;
      console.error("[Discord] API error:", errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: Failed to send Discord message`,
      };
    }

    // Discord webhooks return 204 No Content on success or the message object
    const result = response.status === 204
      ? null
      : ((await response.json().catch(() => ({}))) as DiscordWebhookResponse);

    console.log("[Discord] Message sent successfully");

    return {
      success: true,
      messageId: result?.id || "sent",
    };
  } catch (error) {
    console.error("[Discord] Error sending message:", error);
    return {
      success: false,
      error: `Failed to send Discord message: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function sendDiscordMessageStep(
  input: SendDiscordMessageInput
): Promise<SendDiscordMessageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
sendDiscordMessageStep.maxRetries = 0;

export const _integrationType = "discord";
