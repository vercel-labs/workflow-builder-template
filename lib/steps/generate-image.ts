/**
 * Executable step function for Generate Image action
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import OpenAI from "openai";
import { fetchWorkflowCredentials } from "../credential-fetcher";

export async function generateImageStep(input: {
  workflowId?: string;
  model: string;
  prompt: string;
}): Promise<{ base64: string | undefined }> {
  "use step";

  const credentials = input.workflowId
    ? await fetchWorkflowCredentials(input.workflowId)
    : {};

  const apiKey = credentials.OPENAI_API_KEY || credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY or AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: input.model,
    prompt: input.prompt,
    n: 1,
    response_format: "b64_json",
  });

  if (!response.data?.[0]) {
    throw new Error("Failed to generate image");
  }

  return { base64: response.data[0].b64_json };
}
