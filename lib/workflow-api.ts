import { create } from "@/app/actions/workflow/create";
import { deleteWorkflow } from "@/app/actions/workflow/delete";
import { get } from "@/app/actions/workflow/get";
import { getAll } from "@/app/actions/workflow/get-all";
import { getCurrent } from "@/app/actions/workflow/get-current";
import { saveCurrent } from "@/app/actions/workflow/save-current";
import type { SavedWorkflow, WorkflowData } from "@/app/actions/workflow/types";
import { update } from "@/app/actions/workflow/update";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

export type { SavedWorkflow, WorkflowData };

// Auto-save debounce delay (ms)
const AUTOSAVE_DELAY = 2000;
let autosaveTimeout: NodeJS.Timeout | null = null;

export const workflowApi = {
  // Get all workflows
  getAll(): Promise<SavedWorkflow[]> {
    return getAll();
  },

  // Get a specific workflow
  getById(id: string): Promise<SavedWorkflow | null> {
    return get(id);
  },

  // Create a new workflow
  create(_workflow: Omit<WorkflowData, "id">): Promise<SavedWorkflow> {
    return create(_workflow);
  },

  // Update a workflow
  update(
    _id: string,
    _workflow: Partial<WorkflowData>
  ): Promise<SavedWorkflow> {
    return update(_id, _workflow);
  },

  // Delete a workflow
  delete(id: string): Promise<void> {
    return deleteWorkflow(id);
  },

  // Get current workflow state
  getCurrent(): Promise<WorkflowData> {
    return getCurrent();
  },

  // Save current workflow state
  async saveCurrent(
    _nodes: WorkflowNode[],
    _edges: WorkflowEdge[]
  ): Promise<void> {
    await saveCurrent(_nodes, _edges);
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
  ): Promise<SavedWorkflow> | undefined {
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
