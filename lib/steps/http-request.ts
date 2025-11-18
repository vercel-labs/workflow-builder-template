/**
 * Executable step function for HTTP Request action
 */
export async function httpRequestStep(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}): Promise<unknown> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const data = await response.json();
  console.log("HTTP request completed:", data);
  return data;
}
