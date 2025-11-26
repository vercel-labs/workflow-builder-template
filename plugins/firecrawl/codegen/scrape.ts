/**
 * Code generation template for Firecrawl Scrape action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const scrapeCodegenTemplate = `import FirecrawlApp from '@mendable/firecrawl-js';

export async function firecrawlScrapeStep(input: {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
}) {
  "use step";

  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
  const result = await firecrawl.scrape(input.url, {
    formats: input.formats || ['markdown'],
  });

  return {
    markdown: result.markdown,
    metadata: result.metadata,
  };
}`;

