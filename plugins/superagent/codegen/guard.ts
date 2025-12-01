/**
 * Code generation template for Superagent Guard action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const guardCodegenTemplate = `export async function superagentGuardStep(input: {
  text: string;
}) {
  "use step";

  const response = await fetch("https://app.superagent.sh/api/guard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${process.env.SUPERAGENT_API_KEY!}\`,
    },
    body: JSON.stringify({
      text: input.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Guard API error: \${error}\`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  // Validate response structure - fail safe instead of defaulting to "allow"
  if (!content || typeof content !== "object") {
    throw new Error(
      "Invalid Guard API response: missing or invalid content structure"
    );
  }

  const classification = content.classification;
  if (!classification || (classification !== "allow" && classification !== "block")) {
    throw new Error(
      \`Invalid Guard API response: missing or invalid classification (received: \${JSON.stringify(classification)})\`
    );
  }

  return {
    classification,
    violationTypes: content?.violation_types || [],
    cweCodes: content?.cwe_codes || [],
    reasoning: choice?.message?.reasoning,
  };
}`;
