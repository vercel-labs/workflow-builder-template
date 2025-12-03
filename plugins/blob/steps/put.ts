import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { BlobCredentials } from "../credentials";

const BLOB_API_URL = "https://blob.vercel-storage.com";

type PutBlobResponse = {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
};

type PutBlobResult =
  | { success: true; url: string; downloadUrl: string; pathname: string }
  | { success: false; error: string };

export type PutBlobCoreInput = {
  pathname: string;
  body: string;
  contentType?: string;
  access?: string;
  addRandomSuffix?: string;
};

export type PutBlobInput = StepInput &
  PutBlobCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: PutBlobCoreInput,
  credentials: BlobCredentials
): Promise<PutBlobResult> {
  const token = credentials.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return {
      success: false,
      error:
        "BLOB_READ_WRITE_TOKEN is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.pathname) {
    return {
      success: false,
      error: "Pathname is required",
    };
  }

  if (!input.body) {
    return {
      success: false,
      error: "Content body is required",
    };
  }

  try {
    const url = new URL(`/${input.pathname}`, BLOB_API_URL);

    // Add query parameters
    const addRandomSuffix = input.addRandomSuffix !== "false";
    if (!addRandomSuffix) {
      url.searchParams.set("addRandomSuffix", "false");
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "x-api-version": "7",
    };

    if (input.contentType) {
      headers["x-content-type"] = input.contentType;
    }

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers,
      body: input.body,
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

    const data = (await response.json()) as PutBlobResponse;
    return {
      success: true,
      url: data.url,
      downloadUrl: data.downloadUrl,
      pathname: data.pathname,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to upload blob: ${message}`,
    };
  }
}

export async function putBlobStep(input: PutBlobInput): Promise<PutBlobResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
putBlobStep.maxRetries = 0;

export const _integrationType = "blob";

