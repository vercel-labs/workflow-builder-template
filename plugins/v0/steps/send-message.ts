import "server-only";

import { createClient, type ChatsSendMessageResponse } from "v0-sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";

type SendMessageResult =
  | { success: true; chatId: string; demoUrl?: string }
  | { success: false; error: string };

export type SendMessageInput = StepInput & {
  integrationId?: string;
  chatId: string;
  message: string;
};

/**
 * Send message logic
 */
async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
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

/**
 * Send Message Step
 * Sends a message to an existing v0 chat
 */
export async function sendMessageStep(
  input: SendMessageInput
): Promise<SendMessageResult> {
  "use step";
  return withStepLogging(input, () => sendMessage(input));
}
