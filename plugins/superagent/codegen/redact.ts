/**
 * Code generation template for Superagent Redact action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const redactCodegenTemplate = `export async function superagentRedactStep(input: {
  text: string;
  entities?: string[];
}) {
  "use step";

  const body: { text: string; entities?: string[] } = {
    text: input.text,
  };

  if (input.entities && input.entities.length > 0) {
    body.entities = input.entities;
  }

  const response = await fetch("https://app.superagent.sh/api/redact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${process.env.SUPERAGENT_API_KEY!}\`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Redact API error: \${error}\`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    redactedText: choice?.message?.content || input.text,
    reasoning: choice?.message?.reasoning,
  };
}`;
