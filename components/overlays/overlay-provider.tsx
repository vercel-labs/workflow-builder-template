"use client";

import {
  type ComponentType,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  OverlayComponentProps,
  OverlayContextValue,
  OverlayOptions,
  OverlayStackItem,
} from "./types";

const OverlayContext = createContext<OverlayContextValue | null>(null);

// Separate context for frozen stack (used during exit animations)
const FrozenStackContext = createContext<OverlayStackItem[]>([]);

/**
 * Generate a unique ID for overlay instances
 */
function generateOverlayId(): string {
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type OverlayProviderProps = {
  children: ReactNode;
};

/**
 * Provider component that manages the overlay stack state.
 * Wrap your app with this to enable the overlay system.
 */
export function OverlayProvider({ children }: OverlayProviderProps) {
  const [stack, setStack] = useState<OverlayStackItem[]>([]);
  const frozenStackRef = useRef<OverlayStackItem[]>([]);

  // Keep frozen stack updated when stack is non-empty
  // This preserves the last state for exit animations
  if (stack.length > 0) {
    frozenStackRef.current = stack;
  }

  const open = useCallback(
    <P,>(
      component: ComponentType<OverlayComponentProps<P>>,
      props?: P,
      options?: OverlayOptions
    ): string => {
      const id = generateOverlayId();
      const item: OverlayStackItem = {
        id,
        component: component as ComponentType<OverlayComponentProps>,
        props: (props ?? {}) as Record<string, unknown>,
        options: options ?? {},
      };
      setStack([item]);
      return id;
    },
    []
  );

  const push = useCallback(
    <P,>(
      component: ComponentType<OverlayComponentProps<P>>,
      props?: P,
      options?: OverlayOptions
    ): string => {
      const id = generateOverlayId();
      const item: OverlayStackItem = {
        id,
        component: component as ComponentType<OverlayComponentProps>,
        props: (props ?? {}) as Record<string, unknown>,
        options: options ?? {},
      };
      setStack((prev) => [...prev, item]);
      return id;
    },
    []
  );

  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) {
        // If only one item, close it and call onClose
        const item = prev[0];
        item?.options.onClose?.();
        return [];
      }
      // Pop the top item and call its onClose
      const poppedItem = prev[prev.length - 1];
      poppedItem?.options.onClose?.();
      return prev.slice(0, -1);
    });
  }, []);

  const replace = useCallback(
    <P,>(
      component: ComponentType<OverlayComponentProps<P>>,
      props?: P,
      options?: OverlayOptions
    ): string => {
      const id = generateOverlayId();
      const item: OverlayStackItem = {
        id,
        component: component as ComponentType<OverlayComponentProps>,
        props: (props ?? {}) as Record<string, unknown>,
        options: options ?? {},
      };
      setStack((prev) => {
        if (prev.length === 0) {
          return [item];
        }
        // Replace the top item
        const poppedItem = prev[prev.length - 1];
        poppedItem?.options.onClose?.();
        return [...prev.slice(0, -1), item];
      });
      return id;
    },
    []
  );

  const closeAll = useCallback(() => {
    setStack((prev) => {
      // Call onClose for all items
      for (const item of prev) {
        item.options.onClose?.();
      }
      return [];
    });
  }, []);

  const close = useCallback((id: string) => {
    setStack((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      // Call onClose for all items from this index onwards
      for (let i = index; i < prev.length; i++) {
        prev[i].options.onClose?.();
      }
      return prev.slice(0, index);
    });
  }, []);

  const value = useMemo<OverlayContextValue>(
    () => ({
      stack,
      open,
      push,
      pop,
      replace,
      closeAll,
      close,
      hasOverlays: stack.length > 0,
      depth: stack.length,
    }),
    [stack, open, push, pop, replace, closeAll, close]
  );

  return (
    <OverlayContext.Provider value={value}>
      <FrozenStackContext.Provider value={frozenStackRef.current}>
        {children}
      </FrozenStackContext.Provider>
    </OverlayContext.Provider>
  );
}

/**
 * Hook to access the overlay context.
 * Must be used within an OverlayProvider.
 */
export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlay must be used within an OverlayProvider");
  }
  return context;
}

/**
 * Hook to get the current overlay's position in the stack.
 * Uses frozen stack during exit animations to prevent UI shifts.
 * Returns { index, isFirst, isLast, depth, showBackButton }
 */
export function useOverlayPosition(overlayId: string) {
  const { stack } = useOverlay();
  const frozenStack = useContext(FrozenStackContext);

  // Use frozen stack when real stack is empty (during exit animation)
  const effectiveStack = stack.length > 0 ? stack : frozenStack;
  const index = effectiveStack.findIndex((item) => item.id === overlayId);

  return {
    index,
    isFirst: index === 0,
    isLast: index === effectiveStack.length - 1,
    depth: effectiveStack.length,
    showBackButton: index > 0,
  };
}

// Export context for advanced use cases
export { OverlayContext };
