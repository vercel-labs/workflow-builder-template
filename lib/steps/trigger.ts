/**
 * Trigger step - handles trigger execution with proper logging
 * Also handles workflow completion when called with _workflowComplete
 */
import "server-only";

import {
  logWorkflowComplete,
  type StepInput,
  withStepLogging,
} from "./step-handler";

type TriggerResult = {
  success: true;
  data: Record<string, unknown>;
};

export type TriggerInput = StepInput & {
  triggerData: Record<string, unknown>;
  /** If set, this call is just to log workflow completion (no trigger execution) */
  _workflowComplete?: {
    executionId: string;
    status: "success" | "error";
    output?: unknown;
    error?: string;
    startTime: number;
  };
};

/**
 * Trigger logic - just passes through the trigger data
 */
function executeTrigger(input: TriggerInput): TriggerResult {
  return {
    success: true,
    data: input.triggerData,
  };
}

/**
 * Trigger Step
 * Executes a trigger and logs it properly
 * Also handles workflow completion when called with _workflowComplete
 */
export async function triggerStep(input: TriggerInput): Promise<TriggerResult> {
  "use step";

  // If this is a completion-only call, just log workflow completion
  if (input._workflowComplete) {
    await logWorkflowComplete(input._workflowComplete);
    return { success: true, data: {} };
  }

  // Normal trigger execution with logging
  return withStepLogging(input, () => Promise.resolve(executeTrigger(input)));
}
triggerStep.maxRetries = 0;
