/**
 * Code generation template for Exa Search action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const searchCodegenTemplate = `import Exa from 'exa-js';

export async function exaSearchStep(input: {
  query: string;
  numResults?: number;
  type?: 'auto' | 'neural' | 'fast' | 'deep';
}) {
  "use step";

  const exa = new Exa(process.env.EXA_API_KEY!);

  const result = await exa.search(input.query, {
    numResults: input.numResults || 10,
    type: input.type || 'auto',
  });

  return {
    results: result.results.map((r) => ({
      url: r.url,
      title: r.title,
      publishedDate: r.publishedDate,
      author: r.author,
      text: r.text,
    })),
  };
}`;
