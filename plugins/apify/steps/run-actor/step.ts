import "server-only";

import { ApifyClient } from "apify-client";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";

type ApifyRunActorResult =
  | {
      success: true;
      runId: string;
      status: string;
      datasetId?: string;
      data?: unknown[];
    }
  | { success: false; error: string };

/**
 * Run Actor Step
 * Runs an Apify Actor and optionally waits for results
 */
export async function apifyRunActorStep(
  input: {
    integrationId?: string;
    actorId: string;
    actorInput?: string | Record<string, unknown> | null;
  } & StepInput
): Promise<ApifyRunActorResult> {
  "use step";

  return withStepLogging(input, async () => {
    const credentials = input.integrationId
      ? await fetchCredentials(input.integrationId)
      : {};

    const apiKey = credentials.APIFY_API_TOKEN;

    if (!apiKey) {
      return {
        success: false,
        error: "Apify API Token is not configured.",
      };
    }

    let parsedActorInput: Record<string, unknown> = {};
    if (input?.actorInput) {
      // If it's already an object, use it directly
      if (typeof input.actorInput === "object" && !Array.isArray(input.actorInput)) {
        parsedActorInput = input.actorInput;
      } else if (typeof input.actorInput === "string") {
        // If it's a string, parse it
        try {
          parsedActorInput = JSON.parse(input.actorInput);
        } catch (err) {
          return {
            success: false,
            error: `Cannot parse Actor input: ${getErrorMessage(err)}`,
          };
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
        success: true,
        runId: runData.id || "unknown",
        status: runData.status || "SUCCEEDED",
        datasetId: runData.defaultDatasetId,
        data: datasetItems,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to run Actor: ${getErrorMessage(error)}`,
      };
    }
  });
}
