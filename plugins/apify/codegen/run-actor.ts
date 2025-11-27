/**
 * Code generation template for Apify Run Actor action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const runActorCodegenTemplate = `const APIFY_API_BASE = "https://api.apify.com/v2";

export async function apifyRunActorStep(input: {
  actorId: string;
  actorInput?: Record<string, unknown>;
  waitForFinish?: boolean;
  maxWaitSecs?: number;
}) {
  "use step";

  const apiKey = process.env.APIFY_API_KEY!;
  const waitForFinish = input.waitForFinish !== false;
  const maxWaitSecs = input.maxWaitSecs || 120;

  const runUrl = waitForFinish
    ? \`\${APIFY_API_BASE}/acts/\${encodeURIComponent(input.actorId)}/run-sync-get-dataset-items?timeout=\${maxWaitSecs}\`
    : \`\${APIFY_API_BASE}/acts/\${encodeURIComponent(input.actorId)}/runs\`;

  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify(input.actorInput || {}),
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text().catch(() => "Unknown error");
    throw new Error(\`Failed to run Actor: \${runResponse.status} - \${errorText}\`);
  }

  if (waitForFinish) {
    const data = await runResponse.json();
    return {
      runId: runResponse.headers.get("x-apify-run-id") || "unknown",
      status: "SUCCEEDED",
      data: Array.isArray(data) ? data : [data],
    };
  }

  const runData = await runResponse.json();
  return {
    runId: runData.data?.id || "unknown",
    status: runData.data?.status || "RUNNING",
    datasetId: runData.data?.defaultDatasetId,
  };
}`;
