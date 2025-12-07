import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { WebflowCredentials } from "../credentials";

const WEBFLOW_API_URL = "https://api.webflow.com/v2";

type WebflowSite = {
  id: string;
  workspaceId: string;
  createdOn: string;
  displayName: string;
  shortName: string;
  lastPublished?: string;
  lastUpdated: string;
  previewUrl: string;
  timeZone: string;
  customDomains?: Array<{
    id: string;
    url: string;
    lastPublished?: string;
  }>;
};

type ListSitesResult =
  | {
      success: true;
      sites: Array<{
        id: string;
        displayName: string;
        shortName: string;
        previewUrl: string;
        lastPublished?: string;
        lastUpdated: string;
        customDomains: string[];
      }>;
      count: number;
    }
  | { success: false; error: string };

export type ListSitesCoreInput = Record<string, never>;

export type ListSitesInput = StepInput &
  ListSitesCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  _input: ListSitesCoreInput,
  credentials: WebflowCredentials
): Promise<ListSitesResult> {
  const apiKey = credentials.WEBFLOW_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "WEBFLOW_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const response = await fetch(`${WEBFLOW_API_URL}/sites`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { sites: WebflowSite[] };

    const sites = data.sites.map((site) => ({
      id: site.id,
      displayName: site.displayName,
      shortName: site.shortName,
      previewUrl: site.previewUrl,
      lastPublished: site.lastPublished,
      lastUpdated: site.lastUpdated,
      customDomains: site.customDomains?.map((d) => d.url) || [],
    }));

    return {
      success: true,
      sites,
      count: sites.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list sites: ${getErrorMessage(error)}`,
    };
  }
}

export async function listSitesStep(
  input: ListSitesInput
): Promise<ListSitesResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
listSitesStep.maxRetries = 0;

export const _integrationType = "webflow";
