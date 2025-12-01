import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { getIntegrationById } from "@/lib/db/integrations";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import { getPluginHttpConfig } from "@/plugins/registry";

type HttpRequestResult =
  | { success: true; data: unknown; status: number }
  | { success: false; error: string; status?: number };

type ObjectProperty = {
  id: string;
  key: string;
  value: string;
};

export type HttpRequestInput = StepInput & {
  integrationId?: string;
  endpoint: string;
  httpMethod: string;
  httpHeaders?: string | Record<string, string> | ObjectProperty[];
  httpBody?: string | Record<string, unknown> | ObjectProperty[];
};

function propertiesToObject(
  properties: ObjectProperty[]
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const prop of properties) {
    if (prop.key?.trim()) {
      obj[prop.key] = prop.value;
    }
  }
  return obj;
}

function parseHeaders(
  httpHeaders?: string | Record<string, string> | ObjectProperty[]
): Record<string, string> {
  if (!httpHeaders) {
    return {};
  }

  if (Array.isArray(httpHeaders)) {
    return propertiesToObject(httpHeaders);
  }

  if (typeof httpHeaders === "object") {
    return httpHeaders;
  }

  try {
    const parsed = JSON.parse(httpHeaders);
    if (Array.isArray(parsed)) {
      return propertiesToObject(parsed);
    }
    return parsed;
  } catch {
    return {};
  }
}

function parseBody(
  httpMethod: string,
  httpBody?: string | Record<string, unknown> | ObjectProperty[]
): string | undefined {

  if (httpMethod === "GET" || !httpBody) {
    return undefined;
  }

  if (Array.isArray(httpBody)) {
    const obj = propertiesToObject(httpBody);
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
  }

  if (typeof httpBody === "object") {
    return Object.keys(httpBody).length > 0
      ? JSON.stringify(httpBody)
      : undefined;
  }

  try {
    const parsed = JSON.parse(httpBody);

    if (Array.isArray(parsed)) {
      const obj = propertiesToObject(parsed);
      return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
    }
    return Object.keys(parsed).length > 0 ? JSON.stringify(parsed) : undefined;
  } catch {

    const trimmed = httpBody.trim();
    return trimmed && trimmed !== "{}" ? httpBody : undefined;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function buildUrl(endpoint: string, baseUrl?: string): string {
  if (!baseUrl || endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function httpRequest(
  input: HttpRequestInput
): Promise<HttpRequestResult> {
  if (!input.endpoint) {
    return {
      success: false,
      error: "HTTP request failed: URL is required",
    };
  }

  const headers = parseHeaders(input.httpHeaders);
  const body = parseBody(input.httpMethod, input.httpBody);
  let finalUrl = input.endpoint;

  if (input.integrationId) {
    try {
      const integration = await getIntegrationById(input.integrationId);
      if (!integration) {
        return {
          success: false,
          error: `Integration not found: ${input.integrationId}`,
        };
      }

      const httpConfig = getPluginHttpConfig(integration.type);
      if (!httpConfig) {
        return {
          success: false,
          error: `Integration "${integration.type}" does not support HTTP requests`,
        };
      }

      finalUrl = buildUrl(input.endpoint, httpConfig.baseUrl);

      const credentials = await fetchCredentials(input.integrationId);
      const authValue = credentials[httpConfig.authCredentialKey];

      if (authValue) {
        const authHeader = httpConfig.authHeader || "Authorization";
        const authPrefix = httpConfig.authPrefix ?? "Bearer ";
        headers[authHeader] = `${authPrefix}${authValue}`;
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch integration credentials: ${getErrorMessage(error)}`,
      };
    }
  }

  if (body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(finalUrl, {
      method: input.httpMethod,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        error: `HTTP request failed with status ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    const data = await parseResponse(response);
    return { success: true, data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: `HTTP request failed: ${getErrorMessage(error)}`,
    };
  }
}

export async function httpRequestStep(
  input: HttpRequestInput
): Promise<HttpRequestResult> {
  "use step";
  return withStepLogging(input, () => httpRequest(input));
}
