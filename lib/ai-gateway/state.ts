"use client";

import { atom } from "jotai";
import type { VercelTeam } from "@/lib/api-client";

/**
 * AI Gateway consent modal state
 */
export const showAiGatewayConsentModalAtom = atom(false);

/**
 * Callbacks for the consent modal - stored in atoms so any component can set them
 */
export type AiGatewayConsentCallbacks = {
  onConsent?: (integrationId: string) => void;
  onManualEntry?: () => void;
  onDecline?: () => void;
};

export const aiGatewayConsentCallbacksAtom = atom<AiGatewayConsentCallbacks>(
  {}
);

/**
 * Write-only atom to open the consent modal with specific callbacks.
 * Usage: const openModal = useSetAtom(openAiGatewayConsentModalAtom);
 *        openModal({ onConsent: (id) => ..., onManualEntry: () => ... });
 */
export const openAiGatewayConsentModalAtom = atom(
  null,
  (get, set, callbacks: AiGatewayConsentCallbacks) => {
    set(aiGatewayConsentCallbacksAtom, callbacks);
    set(showAiGatewayConsentModalAtom, true);
  }
);

/**
 * AI Gateway status (fetched from API)
 */
export type AiGatewayStatus = {
  /** Whether the user keys feature is enabled */
  enabled: boolean;
  /** Whether the user is signed in */
  signedIn: boolean;
  /** Whether the user signed in with Vercel OAuth */
  isVercelUser: boolean;
  /** Whether the user has a managed AI Gateway integration */
  hasManagedKey: boolean;
  /** The ID of the managed integration (if exists) */
  managedIntegrationId?: string;
} | null;

export const aiGatewayStatusAtom = atom<AiGatewayStatus>(null);

/**
 * Loading state for consent action
 */
export const aiGatewayConsentLoadingAtom = atom(false);

/**
 * Vercel teams for the current user
 */
export const aiGatewayTeamsAtom = atom<VercelTeam[]>([]);
export const aiGatewayTeamsLoadingAtom = atom(false);
export const aiGatewayTeamsFetchedAtom = atom(false);
