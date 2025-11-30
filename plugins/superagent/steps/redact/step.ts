import "server-only";

import { createClient } from "superagent-ai";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Superagent Redact Step
 * Removes sensitive data (PII/PHI) from text or PDF files
 */
export async function superagentRedactStep(input: {
  integrationId?: string;
  input: string | File | Blob;
  entities?: string[];
  urlWhitelist?: string[];
  format?: "json" | "pdf";
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.SUPERAGENT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Superagent API Key is not configured.",
    };
  }

  try {
    // Validate input
    if (!input.input || (typeof input.input === "string" && input.input.trim() === "")) {
      throw new Error("Input is required for redaction. Please provide text content to redact.");
    }

    const client = createClient({
      apiKey,
    });

    const redactOptions: {
      entities?: string[];
      urlWhitelist?: string[];
      format?: "json" | "pdf";
    } = {};

    // Parse entities if it's a JSON string (stored as string in config)
    if (input.entities) {
      if (typeof input.entities === "string") {
        try {
          const parsed = JSON.parse(input.entities);
          if (Array.isArray(parsed) && parsed.length > 0) {
            redactOptions.entities = parsed;
          }
        } catch {
          // If parsing fails, treat as empty array
        }
      } else if (Array.isArray(input.entities) && input.entities.length > 0) {
        redactOptions.entities = input.entities;
      }
    }

    // Parse urlWhitelist if it's a JSON string
    if (input.urlWhitelist) {
      if (typeof input.urlWhitelist === "string") {
        try {
          const parsed = JSON.parse(input.urlWhitelist);
          if (Array.isArray(parsed) && parsed.length > 0) {
            redactOptions.urlWhitelist = parsed;
          }
        } catch {
          // If parsing fails, treat as empty array
        }
      } else if (
        Array.isArray(input.urlWhitelist) &&
        input.urlWhitelist.length > 0
      ) {
        redactOptions.urlWhitelist = input.urlWhitelist;
      }
    }

    if (input.format) {
      redactOptions.format = input.format;
    }

    const redactResult = await client.redact(input.input, redactOptions);

    const result: {
      redacted: string;
      reasoning?: string;
      usage?: unknown;
      pdf?: Blob;
      redacted_pdf?: string;
    } = {
      redacted: redactResult.redacted || "",
    };

    if (redactResult.reasoning) {
      result.reasoning = redactResult.reasoning;
    }

    if (redactResult.usage) {
      result.usage = redactResult.usage;
    }

    if (redactResult.pdf) {
      result.pdf = redactResult.pdf;
    }

    if (redactResult.redacted_pdf) {
      result.redacted_pdf = redactResult.redacted_pdf;
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to redact input: ${getErrorMessage(error)}`);
  }
}
