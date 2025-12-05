import "server-only";

import { createClient, type ChatsSendMessageResponse } from "v0-sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { V0Credentials } from "../credentials";

type SendMessageResult =
  | { success: true; chatId: string; demoUrl?: string }
  | { success: false; error: string };

export type SendMessageCoreInput = {
  chatId: string;
  message: string;
};

export type SendMessageInput = StepInput &
  SendMessageCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SendMessageCoreInput,
  credentials: V0Credentials
): Promise<SendMessageResult> {
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
 * App entry point - fetches credentials and wraps with logging
 */
export async function sendMessageStep(
  input: SendMessageInput
): Promise<SendMessageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
sendMessageStep.maxRetries = 0;

export const _integrationType = "v0";
