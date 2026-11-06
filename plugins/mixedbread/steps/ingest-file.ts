import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { MixedbreadCredentials } from "../credentials";

const MIXEDBREAD_API_URL = "https://api.mixedbread.com/v1";

type IngestFileResult =
  | { success: true; fileId: string; status: string }
  | { success: false; error: string };

export type MixedbreadIngestFileCoreInput = {
  storeIdentifier: string;
  externalId: string;
  content: string;
  mimetype: string;
  metadata?: string;
};

export type MixedbreadIngestFileInput = StepInput &
  MixedbreadIngestFileCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: MixedbreadIngestFileCoreInput,
  credentials: MixedbreadCredentials
): Promise<IngestFileResult> {
  const apiKey = credentials.MIXEDBREAD_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "MIXEDBREAD_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  let parsedMetadata: Record<string, unknown> | undefined;
  if (input.metadata) {
    try {
      parsedMetadata = JSON.parse(input.metadata);
    } catch {
      return {
        success: false,
        error: "Invalid JSON in metadata field",
      };
    }
  }

  try {
    const fileBlob = new Blob([input.content], { type: input.mimetype });
    const formData = new FormData();

    const params: Record<string, unknown> = {
      external_id: input.externalId,
    };
    if (parsedMetadata) {
      params.metadata = parsedMetadata;
    }
    formData.append("params", JSON.stringify(params));
    formData.append("file", fileBlob, input.externalId);

    const response = await fetch(
      `${MIXEDBREAD_API_URL}/stores/${encodeURIComponent(input.storeIdentifier)}/files/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();

    return {
      success: true,
      fileId: result.id,
      status: result.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to ingest file: ${message}`,
    };
  }
}

export async function mixedbreadIngestFileStep(
  input: MixedbreadIngestFileInput
): Promise<IngestFileResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
mixedbreadIngestFileStep.maxRetries = 0;

export const _integrationType = "mixedbread";
