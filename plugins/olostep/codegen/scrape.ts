/**
 * Code generation template for Olostep Scrape action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const scrapeCodegenTemplate = `export async function olostepScrapeStep(input: {
  url: string;
  formats?: ('markdown' | 'html' | 'text')[];
  waitForSelector?: string;
}) {
  "use step";

  const response = await fetch('https://api.olostep.com/v1/scrapes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.OLOSTEP_API_KEY}\`,
    },
    body: JSON.stringify({
      url_to_scrape: input.url,
      formats: input.formats || ['markdown'],
      wait_for_selector: input.waitForSelector,
    }),
  });

  if (!response.ok) {
    throw new Error(\`Olostep API error: \${await response.text()}\`);
  }

  const result = await response.json();

  return {
    markdown: result.markdown_content || result.markdown,
    html: result.html_content || result.html,
    metadata: {
      title: result.title,
      url: result.url,
      statusCode: result.status_code,
    },
  };
}`;





