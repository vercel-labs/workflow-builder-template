/**
 * Code generation template for Generate Image action
 */
export const generateImageCodegenTemplate = `import { experimental_generateImage as generateImage } from 'ai';

export async function generateImageStep(input: {
  model: string;
  prompt: string;
}) {
  "use step";
  
  const result = await generateImage({
    model: input.model as any,
    prompt: input.prompt,
    size: '1024x1024',
    providerOptions: {
      openai: {
        apiKey: process.env.AI_GATEWAY_API_KEY,
      },
    },
  });
  
  return { base64: result.image.toString() };
}`;
