/**
 * Code generation template for Firecrawl Search action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const searchCodegenTemplate = `import FirecrawlApp from '@mendable/firecrawl-js';

export async function firecrawlSearchStep(input: {
  query: string;
  limit?: number;
}) {
  "use step";

  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
  const result = await firecrawl.search(input.query, {
    limit: input.limit ? Number(input.limit) : undefined,
  });

  return {
    web: result.web,
  };
}`;

