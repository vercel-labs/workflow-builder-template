/**
 * Executable step function for Generate Image action
 *
 * SECURITY PATTERN - External Secret Store:
 * Step fetches credentials using workflow ID reference
 */
import "server-only";

import { experimental_generateImage as generateImage } from "ai";
import { fetchCredentials } from "../credential-fetcher";

export async function generateImageStep(input: {
  integrationId?: string;
  model: string;
  prompt: string;
}): Promise<{ base64: string | undefined }> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const result = await generateImage({
    // biome-ignore lint/suspicious/noExplicitAny: model string needs type coercion for ai package
    model: input.model as any,
    prompt: input.prompt,
    size: "1024x1024",
    providerOptions: {
      openai: {
        apiKey,
      },
    },
  });

  if (!result.image) {
    throw new Error("Failed to generate image");
  }

  // Convert the GeneratedFile to base64 string
  const base64 = result.image.toString();

  return { base64 };
}
