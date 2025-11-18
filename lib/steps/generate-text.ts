/**
 * Executable step function for Generate Text action
 * Uses AI Gateway with {provider}/{model} format (e.g., "openai/gpt-4")
 */
import { generateText } from "ai";

export async function generateTextStep(input: {
  model: string;
  prompt: string;
  apiKey: string;
}): Promise<{ text: string }> {
  const { text } = await generateText({
    model: input.model,
    prompt: input.prompt,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
  });

  console.log("Text generated:", text);
  return { text };
}
