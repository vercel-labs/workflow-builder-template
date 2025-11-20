/**
 * Executable step function for Condition action
 */
export function conditionStep(input: { condition: boolean }): {
  condition: boolean;
} {
  "use step";

  return { condition: input.condition };
}
