import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

const APIFY_API_BASE = "https://api.apify.com/v2";

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
 * Apify Run Actor Step
 * Runs an Apify Actor and optionally waits for results
 */
export async function apifyRunActorStep(input: {
  integrationId?: string;
  actorId: string;
  actorInput?: Record<string, unknown>;
  waitForFinish?: boolean;
  maxWaitSecs?: number;
}): Promise<ApifyRunActorResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.APIFY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Apify API Token is not configured.",
    };
  }

  try {
    const waitForFinish = input.waitForFinish !== false;
    const maxWaitSecs = input.maxWaitSecs || 120;

    // Start the Actor run
    const runUrl = waitForFinish
      ? `${APIFY_API_BASE}/acts/${encodeURIComponent(input.actorId)}/run-sync-get-dataset-items?timeout=${maxWaitSecs}`
      : `${APIFY_API_BASE}/acts/${encodeURIComponent(input.actorId)}/runs`;

    const runResponse = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(input.actorInput || {}),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text().catch(() => "Unknown error");
      return {
        success: false,
        error: `Failed to run Actor: ${runResponse.status} - ${errorText}`,
      };
    }

    if (waitForFinish) {
      // For sync runs, we get the dataset items directly
      const data = await runResponse.json();
      return {
        success: true,
        runId: runResponse.headers.get("x-apify-run-id") || "unknown",
        status: "SUCCEEDED",
        data: Array.isArray(data) ? data : [data],
      };
    }

    // For async runs, we get the run info
    const runData = await runResponse.json();
    return {
      success: true,
      runId: runData.data?.id || "unknown",
      status: runData.data?.status || "RUNNING",
      datasetId: runData.data?.defaultDatasetId,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to run Actor: ${getErrorMessage(error)}`,
    };
  }
}
