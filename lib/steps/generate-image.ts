/**
 * Executable step function for Generate Image action
 */
import OpenAI from "openai";

export async function generateImageStep(input: {
  model: string;
  prompt: string;
  apiKey: string;
}): Promise<{ base64: string | undefined }> {
  "use step";

  const openai = new OpenAI({ apiKey: input.apiKey });

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
