/**
 * Code generation template for Run Apify Actor action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const runActorCodegenTemplate = `import { ApifyClient } from "apify-client";

export async function apifyRunActorStep(input: {
  actorId: string;
  actorInput?: string;
}) {
  "use step";

  const apiKey = process.env.APIFY_API_KEY;

  if (!apiKey) {
    throw new Error("Apify API Token is not configured. Set APIFY_API_KEY environment variable.");
  }

  let parsedActorInput: Record<string, unknown> = {};
  if (input.actorInput) {
    try {
      parsedActorInput = JSON.parse(input.actorInput);
    } catch (err) {
      throw new Error(\`Cannot parse Actor input: \${err instanceof Error ? err.message : String(err)}\`);
    }
  }

  try {
    const client = new ApifyClient({ token: apiKey });
    const actorClient = client.actor(input.actorId);

    // Run synchronously and wait for completion
    const runData = await actorClient.call(parsedActorInput);

    // Get dataset items
    let datasetItems: unknown[] = [];
    if (runData.defaultDatasetId) {
      const dataset = await client
        .dataset(runData.defaultDatasetId)
        .listItems();
      datasetItems = dataset.items;
    }

    return {
      runId: runData.id || "unknown",
      status: runData.status || "SUCCEEDED",
      datasetId: runData.defaultDatasetId,
      datasetItems,
    };
  } catch (error) {
    throw new Error(\`Failed to run Actor: \${error instanceof Error ? error.message : String(error)}\`);
  }
}`;
