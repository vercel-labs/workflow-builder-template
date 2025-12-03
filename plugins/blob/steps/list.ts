import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { BlobCredentials } from "../credentials";

const BLOB_API_URL = "https://blob.vercel-storage.com";

type BlobItem = {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

type ListBlobsResponse = {
  blobs: BlobItem[];
  cursor?: string;
  hasMore: boolean;
};

type ListBlobsResult =
  | {
      success: true;
      blobs: BlobItem[];
      cursor?: string;
      hasMore: boolean;
    }
  | { success: false; error: string };

export type ListBlobsCoreInput = {
  prefix?: string;
  limit?: number;
  cursor?: string;
};

export type ListBlobsInput = StepInput &
  ListBlobsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: ListBlobsCoreInput,
  credentials: BlobCredentials
): Promise<ListBlobsResult> {
  const token = credentials.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return {
      success: false,
      error:
        "BLOB_READ_WRITE_TOKEN is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const url = new URL(BLOB_API_URL);

    if (input.prefix) {
      url.searchParams.set("prefix", input.prefix);
    }

    if (input.limit) {
      url.searchParams.set("limit", String(input.limit));
    }

    if (input.cursor) {
      url.searchParams.set("cursor", input.cursor);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-version": "7",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as ListBlobsResponse;
    return {
      success: true,
      blobs: data.blobs,
      cursor: data.cursor,
      hasMore: data.hasMore,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to list blobs: ${message}`,
    };
  }
}

export async function listBlobsStep(
  input: ListBlobsInput
): Promise<ListBlobsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
listBlobsStep.maxRetries = 0;

export const _integrationType = "blob";

