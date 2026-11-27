import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { DubCredentials } from "../credentials";

const DUB_API_URL = "https://api.dub.co";

type DubLinkResponse = {
  id: string;
  domain: string;
  key: string;
  url: string;
  shortLink: string;
  qrCode: string;
};

type UpsertLinkResult =
  | {
      success: true;
      id: string;
      shortLink: string;
      qrCode: string;
      domain: string;
      key: string;
      url: string;
    }
  | { success: false; error: string };

export type UpsertLinkCoreInput = {
  url: string;
  key?: string;
  domain?: string;
  externalId?: string;
  tenantId?: string;
  programId?: string;
  partnerId?: string;
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export type UpsertLinkInput = StepInput &
  UpsertLinkCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: UpsertLinkCoreInput,
  credentials: DubCredentials
): Promise<UpsertLinkResult> {
  const apiKey = credentials.DUB_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "DUB_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.url) {
    return {
      success: false,
      error: "Destination URL is required",
    };
  }

  try {
    const body: Record<string, string> = {
      url: input.url,
    };

    if (input.key) body.key = input.key;
    if (input.domain) body.domain = input.domain;
    if (input.externalId) body.externalId = input.externalId;
    if (input.tenantId) body.tenantId = input.tenantId;
    if (input.programId) body.programId = input.programId;
    if (input.partnerId) body.partnerId = input.partnerId;
    if (input.title) body.title = input.title;
    if (input.description) body.description = input.description;
    if (input.image) body.image = input.image;
    if (input.video) body.video = input.video;
    if (input.utm_source) body.utm_source = input.utm_source;
    if (input.utm_medium) body.utm_medium = input.utm_medium;
    if (input.utm_campaign) body.utm_campaign = input.utm_campaign;
    if (input.utm_term) body.utm_term = input.utm_term;
    if (input.utm_content) body.utm_content = input.utm_content;

    const response = await fetch(`${DUB_API_URL}/links/upsert`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
        message?: string;
      };
      const errorMessage =
        errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    const link = (await response.json()) as DubLinkResponse;

    return {
      success: true,
      id: link.id,
      shortLink: link.shortLink,
      qrCode: link.qrCode,
      domain: link.domain,
      key: link.key,
      url: link.url,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to upsert link: ${getErrorMessage(error)}`,
    };
  }
}

export async function upsertLinkStep(
  input: UpsertLinkInput
): Promise<UpsertLinkResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
upsertLinkStep.maxRetries = 0;

export const _integrationType = "dub";
