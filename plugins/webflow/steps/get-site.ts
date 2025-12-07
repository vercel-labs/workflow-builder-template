import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { WebflowCredentials } from "../credentials";

const WEBFLOW_API_URL = "https://api.webflow.com/v2";

type WebflowSiteResponse = {
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

type GetSiteResult =
  | {
      success: true;
      id: string;
      displayName: string;
      shortName: string;
      previewUrl: string;
      lastPublished?: string;
      lastUpdated: string;
      timeZone: string;
      customDomains: Array<{
        id: string;
        url: string;
        lastPublished?: string;
      }>;
    }
  | { success: false; error: string };

export type GetSiteCoreInput = {
  siteId: string;
};

export type GetSiteInput = StepInput &
  GetSiteCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetSiteCoreInput,
  credentials: WebflowCredentials
): Promise<GetSiteResult> {
  const apiKey = credentials.WEBFLOW_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "WEBFLOW_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.siteId) {
    return {
      success: false,
      error: "Site ID is required",
    };
  }

  try {
    const response = await fetch(
      `${WEBFLOW_API_URL}/sites/${encodeURIComponent(input.siteId)}`,
      {
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

    const site = (await response.json()) as WebflowSiteResponse;

    return {
      success: true,
      id: site.id,
      displayName: site.displayName,
      shortName: site.shortName,
      previewUrl: site.previewUrl,
      lastPublished: site.lastPublished,
      lastUpdated: site.lastUpdated,
      timeZone: site.timeZone,
      customDomains: site.customDomains || [],
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get site: ${getErrorMessage(error)}`,
    };
  }
}

export async function getSiteStep(
  input: GetSiteInput
): Promise<GetSiteResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getSiteStep.maxRetries = 0;

export const _integrationType = "webflow";
