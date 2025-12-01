/**
 * Code generation template for HTTP Request action
 * Generates standalone code when users export their workflow
 */

export const httpRequestCodegenTemplate = `export async function httpRequestStep(input: {
  endpoint: string;
  httpMethod: string;
  httpHeaders?: Record<string, string>;
  httpBody?: Record<string, unknown>;
}) {
  "use step";

  const headers: Record<string, string> = input.httpHeaders || {};

  // Add Content-Type if body is present and header not set
  let body: string | undefined;
  if (input.httpMethod !== "GET" && input.httpBody && Object.keys(input.httpBody).length > 0) {
    body = JSON.stringify(input.httpBody);
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(input.endpoint, {
    method: input.httpMethod,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}`;
