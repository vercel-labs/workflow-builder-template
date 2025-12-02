/**
 * Code generation template for Olostep Map action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const mapCodegenTemplate = `export async function olostepMapStep(input: {
  url: string;
  limit?: number;
  includeSubdomains?: boolean;
}) {
  "use step";

  const response = await fetch('https://api.olostep.com/v1/map', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.OLOSTEP_API_KEY}\`,
    },
    body: JSON.stringify({
      url: input.url,
      limit: input.limit || 100,
      include_subdomains: input.includeSubdomains || false,
    }),
  });

  if (!response.ok) {
    throw new Error(\`Olostep API error: \${await response.text()}\`);
  }

  const result = await response.json();
  const urls = result.urls || result.links || [];

  return {
    urls: urls.slice(0, input.limit || 100),
    totalUrls: urls.length,
  };
}`;



