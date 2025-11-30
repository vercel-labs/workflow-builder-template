/**
 * Code generation template for Superagent Redact action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const redactCodegenTemplate = `import { createClient } from 'superagent-ai';

export async function superagentRedactStep(input: {
  input: string | File | Blob;
  entities?: string[];
  urlWhitelist?: string[];
  format?: 'json' | 'pdf';
}) {
  "use step";

  const client = createClient({
    apiKey: process.env.SUPERAGENT_API_KEY!,
  });

  const redactOptions: {
    entities?: string[];
    urlWhitelist?: string[];
    format?: 'json' | 'pdf';
  } = {};

  if (input.entities && input.entities.length > 0) {
    redactOptions.entities = input.entities;
  }

  if (input.urlWhitelist && input.urlWhitelist.length > 0) {
    redactOptions.urlWhitelist = input.urlWhitelist;
  }

  if (input.format) {
    redactOptions.format = input.format;
  }

  const redactResult = await client.redact(input.input, redactOptions);

  const result: {
    redacted: string;
    reasoning?: string;
    usage?: unknown;
    pdf?: Blob;
    redacted_pdf?: string;
  } = {
    redacted: redactResult.redacted || '',
  };

  if (redactResult.reasoning) {
    result.reasoning = redactResult.reasoning;
  }

  if (redactResult.usage) {
    result.usage = redactResult.usage;
  }

  if (redactResult.pdf) {
    result.pdf = redactResult.pdf;
  }

  if (redactResult.redacted_pdf) {
    result.redacted_pdf = redactResult.redacted_pdf;
  }

  return result;
}`;
