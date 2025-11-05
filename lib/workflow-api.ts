import { create } from "@/app/actions/workflow/create";
import { deleteWorkflow } from "@/app/actions/workflow/delete";
import { get } from "@/app/actions/workflow/get";
import { getAll } from "@/app/actions/workflow/get-all";
import { getCurrent } from "@/app/actions/workflow/get-current";
import { saveCurrent } from "@/app/actions/workflow/save-current";
import { update } from "@/app/actions/workflow/update";
import type { SavedWorkflow, WorkflowData } from "@/app/actions/workflow/types";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

export type { SavedWorkflow, WorkflowData };

// Auto-save debounce delay (ms)
const AUTOSAVE_DELAY = 2000;
let autosaveTimeout: NodeJS.Timeout | null = null;

export const workflowApi = {
  // Get all workflows
  async getAll(): Promise<SavedWorkflow[]> {
    return getAll();
  },

  // Get a specific workflow
  async getById(id: string): Promise<SavedWorkflow> {
    return get(id);
  },

  // Create a new workflow
  async create(workflow: Omit<WorkflowData, "id">): Promise<SavedWorkflow> {
    return create(workflow);
  },

  // Update a workflow
  async update(
    id: string,
    workflow: Partial<WorkflowData>
  ): Promise<SavedWorkflow> {
    return update(id, workflow);
  },

  // Delete a workflow
  async delete(id: string): Promise<void> {
    return deleteWorkflow(id);
  },

  // Get current workflow state
  async getCurrent(): Promise<WorkflowData> {
    return getCurrent();
  },

  // Save current workflow state
  async saveCurrent(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<void> {
    await saveCurrent(nodes, edges);
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
