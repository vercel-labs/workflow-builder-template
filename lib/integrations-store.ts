import { atom } from "jotai";
import { api, type Integration } from "@/lib/api-client";

// Store for all user integrations
export const integrationsAtom = atom<Integration[]>([]);

// Loading state for integrations
export const integrationsLoadingAtom = atom<boolean>(false);

// Track if integrations have been fetched at least once
export const integrationsFetchedAtom = atom<boolean>(false);

// Selected integration for forms/dialogs
export const selectedIntegrationAtom = atom<Integration | null>(null);

// Fetch integrations action - returns the fetched integrations
export const fetchIntegrationsAtom = atom(null, async (get, set) => {
  // Skip if already loading
  if (get(integrationsLoadingAtom)) {
    return get(integrationsAtom);
  }

  set(integrationsLoadingAtom, true);
  try {
    const integrations = await api.integration.getAll();
    set(integrationsAtom, integrations);
    set(integrationsFetchedAtom, true);
    return integrations;
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return get(integrationsAtom);
  } finally {
    set(integrationsLoadingAtom, false);
  }
});

// Get integrations by type (derived atom)
export const integrationsByTypeAtom = atom((get) => {
  const integrations = get(integrationsAtom);
  return (type: string) => integrations.filter((i) => i.type === type);
});
