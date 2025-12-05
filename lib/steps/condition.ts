/**
 * Executable step function for Condition action
 */
import "server-only";

import { type StepInput, withStepLogging } from "./step-handler";

export type ConditionInput = StepInput & {
  condition: boolean;
  /** Original condition expression string for logging (e.g., "{{@nodeId:Label.field}} === 'good'") */
  expression?: string;
  /** Resolved values of template variables for logging (e.g., { "Label.field": "actual_value" }) */
  values?: Record<string, unknown>;
};

type ConditionResult = {
  condition: boolean;
};

function evaluateCondition(input: ConditionInput): ConditionResult {
  return { condition: input.condition };
}

// biome-ignore lint/suspicious/useAwait: workflow "use step" requires async
export async function conditionStep(
  input: ConditionInput
): Promise<ConditionResult> {
  "use step";
  return withStepLogging(input, () =>
    Promise.resolve(evaluateCondition(input))
  );
}
conditionStep.maxRetries = 0;
