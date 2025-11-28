import "server-only";

import { createClient, type ChatsSendMessageResponse } from "v0-sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type SendMessageResult =
  | { success: true; chatId: string; demoUrl?: string }
  | { success: false; error: string };

/**
 * Send Message Step
 * Sends a message to an existing v0 chat
 */
export async function sendMessageStep(input: {
  integrationId?: string;
  chatId: string;
  message: string;
}): Promise<SendMessageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.V0_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "V0_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const client = createClient({ apiKey });

    const result = (await client.chats.sendMessage({
      chatId: input.chatId,
      message: input.message,
    })) as ChatsSendMessageResponse;

    return {
      success: true,
      chatId: result.id,
      demoUrl: result.latestVersion?.demoUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send message: ${getErrorMessage(error)}`,
    };
  }
}

