import { atom } from "jotai";
import type { ComponentType } from "react";
import type {
  OpenOverlayParams,
  OverlayComponentProps,
  OverlayOptions,
  OverlayStackItem,
} from "@/components/overlays/types";

/**
 * Atom holding the current overlay stack.
 * This is the source of truth that syncs with OverlayProvider.
 */
export const overlayStackAtom = atom<OverlayStackItem[]>([]);

/**
 * Read-only atom for checking if there are any overlays open
 */
export const hasOverlaysAtom = atom((get) => get(overlayStackAtom).length > 0);

/**
 * Read-only atom for getting the current stack depth
 */
export const overlayDepthAtom = atom((get) => get(overlayStackAtom).length);

/**
 * Generate a unique ID for overlay instances
 */
function generateOverlayId(): string {
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Write-only atom to open a new overlay (replaces existing stack)
 *
 * @example
 * ```tsx
 * const openOverlay = useSetAtom(openOverlayAtom);
 * openOverlay({
 *   component: SettingsOverlay,
 *   props: { tab: "account" },
 *   options: { title: "Settings" }
 * });
 * ```
 */
export const openOverlayAtom = atom(
  null,
  (get, set, params: OpenOverlayParams) => {
    const id = generateOverlayId();
    const item: OverlayStackItem = {
      id,
      component: params.component as ComponentType<OverlayComponentProps>,
      props: (params.props ?? {}) as Record<string, unknown>,
      options: params.options ?? {},
    };
    set(overlayStackAtom, [item]);
    return id;
  }
);

/**
 * Write-only atom to push a new overlay onto the stack
 *
 * @example
 * ```tsx
 * const pushOverlay = useSetAtom(pushOverlayAtom);
 * pushOverlay({
 *   component: EditProfileOverlay,
 *   props: { userId: "123" }
 * });
 * ```
 */
export const pushOverlayAtom = atom(
  null,
  (get, set, params: OpenOverlayParams) => {
    const id = generateOverlayId();
    const item: OverlayStackItem = {
      id,
      component: params.component as ComponentType<OverlayComponentProps>,
      props: (params.props ?? {}) as Record<string, unknown>,
      options: params.options ?? {},
    };
    set(overlayStackAtom, [...get(overlayStackAtom), item]);
    return id;
  }
);

/**
 * Write-only atom to pop the top overlay from the stack
 *
 * @example
 * ```tsx
 * const popOverlay = useSetAtom(popOverlayAtom);
 * popOverlay();
 * ```
 */
export const popOverlayAtom = atom(null, (get, set) => {
  const stack = get(overlayStackAtom);
  if (stack.length <= 1) {
    // Call onClose for the last item
    const item = stack[0];
    item?.options.onClose?.();
    set(overlayStackAtom, []);
    return;
  }
  // Pop the top item and call its onClose
  const poppedItem = stack[stack.length - 1];
  poppedItem?.options.onClose?.();
  set(overlayStackAtom, stack.slice(0, -1));
});

/**
 * Write-only atom to replace the current overlay with a new one
 *
 * @example
 * ```tsx
 * const replaceOverlay = useSetAtom(replaceOverlayAtom);
 * replaceOverlay({
 *   component: SuccessOverlay,
 *   props: { message: "Done!" }
 * });
 * ```
 */
export const replaceOverlayAtom = atom(
  null,
  (get, set, params: OpenOverlayParams) => {
    const stack = get(overlayStackAtom);
    const id = generateOverlayId();
    const item: OverlayStackItem = {
      id,
      component: params.component as ComponentType<OverlayComponentProps>,
      props: (params.props ?? {}) as Record<string, unknown>,
      options: params.options ?? {},
    };

    if (stack.length === 0) {
      set(overlayStackAtom, [item]);
    } else {
      // Call onClose for the replaced item
      const poppedItem = stack[stack.length - 1];
      poppedItem?.options.onClose?.();
      set(overlayStackAtom, [...stack.slice(0, -1), item]);
    }
    return id;
  }
);

/**
 * Write-only atom to close all overlays
 *
 * @example
 * ```tsx
 * const closeAllOverlays = useSetAtom(closeAllOverlaysAtom);
 * closeAllOverlays();
 * ```
 */
export const closeAllOverlaysAtom = atom(null, (get, set) => {
  const stack = get(overlayStackAtom);
  // Call onClose for all items
  for (const item of stack) {
    item.options.onClose?.();
  }
  set(overlayStackAtom, []);
});

/**
 * Write-only atom to close a specific overlay by ID
 *
 * @example
 * ```tsx
 * const closeOverlay = useSetAtom(closeOverlayAtom);
 * closeOverlay("overlay-123");
 * ```
 */
export const closeOverlayAtom = atom(null, (get, set, id: string) => {
  const stack = get(overlayStackAtom);
  const index = stack.findIndex((item) => item.id === id);
  if (index === -1) return;

  // Call onClose for all items from this index onwards
  for (let i = index; i < stack.length; i++) {
    stack[i].options.onClose?.();
  }
  set(overlayStackAtom, stack.slice(0, index));
});

/**
 * Helper type for opening overlays with proper typing
 */
export type OpenOverlayFn = <P>(
  component: ComponentType<OverlayComponentProps<P>>,
  props?: P,
  options?: OverlayOptions
) => string;
