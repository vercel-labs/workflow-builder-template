import "server-only";
import { WebClient } from "@slack/web-api";

export interface SendSlackMessageParams {
  channel: string;
  text: string;
  apiKey: string;
  threadTs?: string;
}

export interface SendSlackMessageResult {
  status: "success" | "error";
  ts?: string;
  error?: string;
}

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(
  params: SendSlackMessageParams
): Promise<SendSlackMessageResult> {
  try {
    if (!params.apiKey) {
      return {
        status: "error",
        error: "Slack API key not configured",
      };
    }

    const client = new WebClient(params.apiKey);

    const result = await client.chat.postMessage({
      channel: params.channel,
      text: params.text,
      thread_ts: params.threadTs,
    });

    if (!result.ok) {
      return {
        status: "error",
        error: result.error || "Failed to send message",
      };
    }

    return {
      status: "success",
      ts: result.ts,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Slack channels
 */
export async function getSlackChannels(apiKey: string) {
  try {
    if (!apiKey) {
      return [];
    }

    const client = new WebClient(apiKey);
    const result = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 100,
    });

    if (!(result.ok && result.channels)) {
      return [];
    }

    return result.channels.map((channel) => ({
      id: channel.id || "",
      name: channel.name || "",
    }));
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    return [];
  }
}
