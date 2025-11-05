"use server";

import { generateWorkflowSDKCode } from "@/lib/workflow-codegen-sdk";
import { getSession, verifyWorkflowOwnership } from "./utils";

/**
 * Generate workflow SDK code
 */
export async function getCode(
  id: string
): Promise<{ code: string; workflowName: string }> {
  const session = await getSession();
  const workflow = await verifyWorkflowOwnership(id, session.user.id);

  // Generate code
  const code = generateWorkflowSDKCode(
    workflow.name,
    workflow.nodes,
    workflow.edges
  );

  return {
    code,
    workflowName: workflow.name,
  };
}
