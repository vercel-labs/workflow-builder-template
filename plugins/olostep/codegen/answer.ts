/**
 * Code generation template for Olostep Answer action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const answerCodegenTemplate = `export async function olostepAnswerStep(input: {
  question: string;
  urls?: string[];
  searchQuery?: string;
}) {
  "use step";

  const requestBody: Record<string, unknown> = {
    question: input.question,
  };

  if (input.urls && input.urls.length > 0) {
    requestBody.urls = input.urls;
  }

  if (input.searchQuery) {
    requestBody.search_query = input.searchQuery;
  }

  const response = await fetch('https://api.olostep.com/v1/answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.OLOSTEP_API_KEY}\`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(\`Olostep API error: \${await response.text()}\`);
  }

  const result = await response.json();

  return {
    answer: result.answer || result.response || '',
    sources: (result.sources || result.references || []).map((source: any) => ({
      url: source.url || source.link,
      title: source.title,
    })),
  };
}`;



