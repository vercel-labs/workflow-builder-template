/**
 * Executable step function for Condition action
 */
import "server-only";

import { type StepInput, withStepLogging } from "./step-handler";

export type ConditionInput = StepInput & {
  condition: boolean;
};

// biome-ignore lint/suspicious/useAwait: workflow "use step" requires async
export async function conditionStep(input: ConditionInput): Promise<{
  condition: boolean;
}> {
  "use step";

  return withStepLogging(input, () =>
    Promise.resolve({ condition: input.condition })
  );
}
