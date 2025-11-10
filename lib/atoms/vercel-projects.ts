import { atom } from "jotai";

export interface VercelProject {
  id: string;
  name: string;
  vercelProjectId: string;
}

// Atoms for project state
// No caching - projects and workflows load fresh each time
export const vercelProjectsAtom = atom<VercelProject[]>([]);
export const selectedProjectIdAtom = atom<string>("none");

// UI state atoms (don't need to persist)
export const showNewProjectDialogAtom = atom<boolean>(false);
export const newProjectNameAtom = atom<string>("");
export const creatingProjectAtom = atom<boolean>(false);
