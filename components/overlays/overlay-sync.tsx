"use client";

import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { overlayStackAtom } from "@/lib/atoms/overlay";
import { useOverlay } from "./overlay-provider";

/**
 * Syncs the overlay context state with Jotai atoms.
 * This enables using either the context API or Jotai atoms interchangeably.
 *
 * Place this inside both OverlayProvider and Jotai Provider.
 */
export function OverlaySync() {
  const { stack } = useOverlay();
  const [atomStack, setAtomStack] = useAtom(overlayStackAtom);
  const isUpdatingFromAtom = useRef(false);
  const isUpdatingFromContext = useRef(false);

  // Sync context -> atom
  useEffect(() => {
    if (isUpdatingFromAtom.current) {
      isUpdatingFromAtom.current = false;
      return;
    }
    isUpdatingFromContext.current = true;
    setAtomStack(stack);
  }, [stack, setAtomStack]);

  // Note: Full two-way sync would require the provider to accept external state.
  // For now, the atoms are read-only views of the context state.
  // To use atoms for mutations, we'd need to refactor the provider.

  return null;
}
