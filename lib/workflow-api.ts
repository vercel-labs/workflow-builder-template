import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

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

// Auto-save debounce delay (ms)
const AUTOSAVE_DELAY = 2000;
let autosaveTimeout: NodeJS.Timeout | null = null;

export const workflowApi = {
  // Get all workflows
  async getAll(): Promise<SavedWorkflow[]> {
    const response = await fetch("/api/workflows");
    if (!response.ok) {
      throw new Error("Failed to fetch workflows");
    }
    return response.json();
  },

  // Get a specific workflow
  async getById(id: string): Promise<SavedWorkflow> {
    const response = await fetch(`/api/workflows/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch workflow");
    }
    return response.json();
  },

  // Create a new workflow
  async create(workflow: WorkflowData): Promise<SavedWorkflow> {
    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    if (!response.ok) {
      throw new Error("Failed to create workflow");
    }
    return response.json();
  },

  // Update a workflow
  async update(
    id: string,
    workflow: Partial<WorkflowData>
  ): Promise<SavedWorkflow> {
    const response = await fetch(`/api/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    if (!response.ok) {
      throw new Error("Failed to update workflow");
    }
    return response.json();
  },

  // Delete a workflow
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/workflows/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete workflow");
    }
  },

  // Get current workflow state
  async getCurrent(): Promise<WorkflowData> {
    const response = await fetch("/api/workflows/current");
    if (!response.ok) {
      throw new Error("Failed to fetch current workflow");
    }
    return response.json();
  },

  // Save current workflow state
  async saveCurrent(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<void> {
    const response = await fetch("/api/workflows/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges }),
    });
    if (!response.ok) {
      throw new Error("Failed to save current workflow");
    }
  },

  // Auto-save current workflow with debouncing
  autoSaveCurrent(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }

    autosaveTimeout = setTimeout(() => {
      this.saveCurrent(nodes, edges).catch((error) => {
        console.error("Auto-save failed:", error);
      });
    }, AUTOSAVE_DELAY);
  },

  // Auto-save specific workflow with debouncing
  autoSaveWorkflow(
    id: string,
    data: Partial<WorkflowData>,
    debounce = true
  ): Promise<SavedWorkflow> | void {
    if (!debounce) {
      return this.update(id, data);
    }

    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }

    autosaveTimeout = setTimeout(() => {
      this.update(id, data).catch((error) => {
        console.error("Auto-save failed:", error);
      });
    }, AUTOSAVE_DELAY);
  },
};
