/**
 * Code generation template for Superagent Guard action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const guardCodegenTemplate = `import { createClient } from 'superagent-ai';

export async function superagentGuardStep(input: {
  input: string | File | Blob;
  onBlock?: 'stop' | 'continue';
}) {
  "use step";

  const client = createClient({
    apiKey: process.env.SUPERAGENT_API_KEY!,
  });

  const guardResult = await client.guard(input.input, {
    onBlock: (reason) => {
      if (input.onBlock === 'stop') {
        throw new Error(\`Guard blocked: \${reason}\`);
      }
    },
    onPass: () => {
      // Guard approved, continue
    },
  });

  if (guardResult.rejected && input.onBlock === 'stop') {
    throw new Error(
      \`Guard blocked: \${guardResult.reasoning || 'Security threat detected'}\`
    );
  }

  return {
    rejected: guardResult.rejected || false,
    reasoning: guardResult.reasoning || '',
    decision: guardResult.decision,
    usage: guardResult.usage,
  };
}`;
