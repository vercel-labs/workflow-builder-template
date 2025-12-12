/**
 * Code generation template for Run Actor action
 * This template is used when exporting workflows to standalone Next.js projects
 * It uses environment variables instead of integrationId
 */
export const runActorCodegenTemplate = `import { ApifyClient } from "apify-client";

export async function apifyRunActorStep(input: {
  actorId: string;
  actorInput?: string | Record<string, unknown> | null;
}) {
  "use step";

  const apiKey = process.env.APIFY_API_TOKEN;

  if (!apiKey) {
    throw new Error("Apify API Token is not configured. Set APIFY_API_TOKEN environment variable.");
  }

  let parsedActorInput: Record<string, unknown> = {};
  if (input.actorInput) {
    // If it's already an object, use it directly
    if (typeof input.actorInput === "object" && !Array.isArray(input.actorInput)) {
      parsedActorInput = input.actorInput;
    } else if (typeof input.actorInput === "string") {
      // If it's a string, parse it
      try {
        parsedActorInput = JSON.parse(input.actorInput);
      } catch (err) {
        throw new Error(\`Cannot parse Actor input: \${err instanceof Error ? err.message : String(err)}\`);
      }
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
      data: datasetItems,
    };
  } catch (error) {
    throw new Error(\`Failed to run Actor: \${error instanceof Error ? error.message : String(error)}\`);
  }
}`;
