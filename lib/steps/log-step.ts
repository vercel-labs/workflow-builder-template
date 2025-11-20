/**
 * Logging step for workflow execution tracking
 * Uses regular fetch to send logs to API endpoint
 */
import "server-only";

import { redactSensitiveData } from "../utils/redact";

export type LogStepInput = {
  action: "start" | "complete";
  executionId?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  nodeInput?: unknown;
  logId?: string;
  startTime?: number;
  status?: "success" | "error";
  output?: unknown;
  error?: string;
};

export async function logStep(input: LogStepInput): Promise<{
  logId?: string;
  startTime?: number;
  success: boolean;
}> {
  "use step";

  try {
    // Redact sensitive data from input and output before logging
    const redactedInput = redactSensitiveData(input.nodeInput);
    const redactedOutput = redactSensitiveData(input.output);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/workflow-log`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: input.action,
          data: {
            executionId: input.executionId,
            nodeId: input.nodeId,
            nodeName: input.nodeName,
            nodeType: input.nodeType,
            input: redactedInput,
            logId: input.logId,
            startTime: input.startTime,
            status: input.status,
            output: redactedOutput,
            error: input.error,
          },
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      return { ...result, success: true };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to log:", error);
    return { success: true };
  }
}
