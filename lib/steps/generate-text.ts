/**
 * Executable step function for Generate Text action
 * Uses AI Gateway with {provider}/{model} format (e.g., "openai/gpt-4")
 */
import { generateText } from "ai";

export async function generateTextStep(input: {
  aiModel?: string;
  aiPrompt?: string;
  apiKey: string;
}): Promise<{ text: string }> {
  // Get model and prompt from input
  const modelId = input.aiModel || "gpt-4o-mini";
  const promptText = input.aiPrompt || "";

  console.log("Generate Text - Model:", modelId, "Prompt:", promptText);
  console.log(
    "[DEBUG Generate Text] API Key:",
    input.apiKey ? `${input.apiKey.substring(0, 10)}...` : "undefined"
  );

  if (!promptText || promptText.trim() === "") {
    throw new Error("Prompt is required for text generation");
  }

  // Determine provider from model ID for AI Gateway format
  let providerName = "openai"; // default

  if (modelId.startsWith("claude-")) {
    providerName = "anthropic";
  } else if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
    providerName = "openai";
  }

  // Use AI Gateway format: {provider}/{model}
  const modelString = `${providerName}/${modelId}`;
  console.log("Using AI Gateway model string:", modelString);

  const { text } = await generateText({
    model: modelString,
    prompt: promptText,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
  });

  console.log("Text generated:", text);
  return { text };
}
