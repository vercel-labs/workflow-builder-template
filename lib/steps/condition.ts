/**
 * Executable step function for Condition action
 */
export function conditionStep(input: { condition: boolean }): {
  condition: boolean;
} {
  console.log("Condition evaluated:", input.condition);
  return { condition: input.condition };
}
