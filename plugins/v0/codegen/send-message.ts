/**
 * Code generation template for Send Message action
 * Used when exporting workflows to standalone Next.js projects
 */
export const sendMessageCodegenTemplate = `import { createClient, type ChatsSendMessageResponse } from 'v0-sdk';

export async function sendMessageStep(input: {
  chatId: string;
  message: string;
}) {
  "use step";
  
  const client = createClient({ apiKey: process.env.V0_API_KEY! });
  
  const result = await client.chats.sendMessage({
    chatId: input.chatId,
    message: input.message,
  }) as ChatsSendMessageResponse;
  
  return {
    chatId: result.id,
    demoUrl: result.latestVersion?.demoUrl,
  };
}`;

