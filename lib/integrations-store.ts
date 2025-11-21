import { atom } from "jotai";
import type { Integration } from "@/lib/api-client";

// Store for all user integrations
export const integrationsAtom = atom<Integration[]>([]);

// Selected integration for forms/dialogs
export const selectedIntegrationAtom = atom<Integration | null>(null);
