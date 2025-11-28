/**
 * Code generation template for Create Chat action
 * Used when exporting workflows to standalone Next.js projects
 */
export const createChatCodegenTemplate = `import { createClient, type ChatsCreateResponse } from 'v0-sdk';

export async function createChatStep(input: {
  message: string;
  system?: string;
}) {
  "use step";
  
  const client = createClient({ apiKey: process.env.V0_API_KEY! });
  
  const result = await client.chats.create({
    message: input.message,
    system: input.system,
  }) as ChatsCreateResponse;
  
  return {
    chatId: result.id,
    url: result.webUrl,
    demoUrl: result.latestVersion?.demoUrl,
  };
}`;

