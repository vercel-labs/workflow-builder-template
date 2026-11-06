/**
 * Code generation template for Olostep Search action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const searchCodegenTemplate = `export async function olostepSearchStep(input: {
  query: string;
  limit?: number;
  country?: string;
}) {
  "use step";

  const params = new URLSearchParams({
    query: input.query,
    limit: String(input.limit || 10),
  });

  if (input.country) {
    params.append('country', input.country);
  }

  const response = await fetch(
    \`https://api.olostep.com/v1/google-search?\${params.toString()}\`,
    {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${process.env.OLOSTEP_API_KEY}\`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(\`Olostep API error: \${await response.text()}\`);
  }

  const result = await response.json();

  return {
    results: (result.results || result.items || []).slice(0, input.limit || 10).map((item: any) => ({
      url: item.url || item.link,
      title: item.title,
      description: item.description || item.snippet,
      markdown: item.markdown,
    })),
    totalResults: result.total_results,
  };
}`;





