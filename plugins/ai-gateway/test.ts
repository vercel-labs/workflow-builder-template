import { createGateway, generateText } from "ai";

export async function testAiGateway(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "AI_GATEWAY_API_KEY is required",
      };
    }

    // Try a simple text generation to verify the API key works
    const gateway = createGateway({ apiKey });

    await generateText({
      model: gateway("openai/gpt-4o-mini"),
      prompt: "Say 'test' if you can read this.",
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
