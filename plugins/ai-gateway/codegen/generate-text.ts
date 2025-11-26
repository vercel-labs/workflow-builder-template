/**
 * Code generation template for Generate Text action
 */
export const generateTextCodegenTemplate = `import { generateText, generateObject } from 'ai';
import { z } from 'zod';

export async function generateTextStep(input: {
  model: string;
  prompt: string;
  format?: string;
  schema?: string;
}) {
  "use step";
  
  // Handle structured output if schema is provided
  if (input.format === 'object' && input.schema) {
    try {
      const schema = JSON.parse(input.schema);
      
      // Build Zod schema from the schema definition
      const schemaShape: Record<string, z.ZodTypeAny> = {};
      for (const field of schema) {
        if (field.type === 'string') {
          schemaShape[field.name] = z.string();
        } else if (field.type === 'number') {
          schemaShape[field.name] = z.number();
        } else if (field.type === 'boolean') {
          schemaShape[field.name] = z.boolean();
        }
      }
      
      const zodSchema = z.object(schemaShape);

      const { object } = await generateObject({
        model: input.model,
        prompt: input.prompt,
        schema: zodSchema,
      });

      return object;
    } catch {
      // If structured output fails, fall back to text generation
    }
  }
  
  const { text } = await generateText({
    model: input.model,
    prompt: input.prompt,
  });
  
  return { text };
}`;
