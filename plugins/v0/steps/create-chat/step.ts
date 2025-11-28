import "server-only";

import { createClient, type ChatsCreateResponse } from "v0-sdk";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

type CreateChatResult =
  | { success: true; chatId: string; url: string; demoUrl?: string }
  | { success: false; error: string };

/**
 * Create Chat Step
 * Creates a new chat in v0
 */
export async function createChatStep(input: {
  integrationId?: string;
  message: string;
  system?: string;
}): Promise<CreateChatResult> {
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

    const result = (await client.chats.create({
      message: input.message,
      system: input.system,
    })) as ChatsCreateResponse;

    return {
      success: true,
      chatId: result.id,
      url: result.webUrl,
      demoUrl: result.latestVersion?.demoUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create chat: ${getErrorMessage(error)}`,
    };
  }
}

