import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export interface WorkflowData {
  id?: string;
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  vercelProjectId?: string | null;
}

export interface SavedWorkflow extends WorkflowData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  vercelProject?: {
    id: string;
    name: string;
    vercelProjectId: string;
  } | null;
}
