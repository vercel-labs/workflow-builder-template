export type ApiCallParams = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
};

export type ApiCallResult = {
  status: "success" | "error";
  statusCode?: number;
  data?: unknown;
  error?: string;
};

/**
 * Make an HTTP API call
 */
export async function callApi(params: ApiCallParams): Promise<ApiCallResult> {
  const { url, method = "GET", headers = {}, body, timeout = 30_000 } = params;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: unknown;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return {
        status: "error",
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data,
      };
    }

    return {
      status: "success",
      statusCode: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          status: "error",
          error: `Request timeout after ${timeout}ms`,
        };
      }
      return {
        status: "error",
        error: error.message,
      };
    }
    return {
      status: "error",
      error: "Unknown error",
    };
  }
}

/**
 * Make a GET request
 */
export function get(
  url: string,
  headers?: Record<string, string>
): Promise<ApiCallResult> {
  return callApi({ url, method: "GET", headers });
}

/**
 * Make a POST request
 */
export function post(
  url: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<ApiCallResult> {
  return callApi({ url, method: "POST", body, headers });
}

/**
 * Make a PUT request
 */
export function put(
  url: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<ApiCallResult> {
  return callApi({ url, method: "PUT", body, headers });
}

/**
 * Make a PATCH request
 */
export function patch(
  url: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<ApiCallResult> {
  return callApi({ url, method: "PATCH", body, headers });
}

/**
 * Make a DELETE request
 */
export function del(
  url: string,
  headers?: Record<string, string>
): Promise<ApiCallResult> {
  return callApi({ url, method: "DELETE", headers });
}
