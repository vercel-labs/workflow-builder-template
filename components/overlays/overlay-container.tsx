"use client";

import type { Variants } from "motion/react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useOverlay } from "./overlay-provider";

// iOS-like spring configuration
const iosSpring = {
  type: "spring",
  stiffness: 400,
  damping: 35,
  mass: 0.8,
} as const;

// Softer spring for drawer
const drawerSpring = {
  type: "spring",
  stiffness: 350,
  damping: 30,
  mass: 0.8,
} as const;

/**
 * Variants for the dialog container (fade in/out)
 */
const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Variants for drawer container
 */
const drawerContainerVariants: Variants = {
  hidden: {
    y: "100%",
    opacity: 0.5,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: drawerSpring,
  },
  exit: {
    y: "100%",
    opacity: 0.5,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 40,
    },
  },
};

/**
 * Get x position for overlay item based on its position relative to current
 */
function getOverlayXPosition(
  isCurrent: boolean,
  isPrevious: boolean
): "0%" | "-35%" | "100%" {
  if (isCurrent) return "0%";
  if (isPrevious) return "-35%";
  return "100%";
}

/**
 * Hook to track direction of stack changes (push vs pop)
 * Returns 1 for push, -1 for pop
 */
function useStackDirection(stackLength: number) {
  const prevLength = useRef(stackLength);
  const direction = useRef(1);

  // Compute synchronously during render for immediate value
  if (stackLength > prevLength.current) {
    direction.current = 1; // pushing
  } else if (stackLength < prevLength.current) {
    direction.current = -1; // popping
  }

  // Update prevLength after render
  useLayoutEffect(() => {
    prevLength.current = stackLength;
  }, [stackLength]);

  return direction.current;
}

/**
 * Desktop dialog container with internal sliding content
 * Renders all stack items persistently in the same React tree location,
 * using CSS transforms to animate visibility while preserving component state
 */
function DesktopOverlayContainer() {
  const { stack, closeAll, pop } = useOverlay();
  const shouldReduceMotion = useReducedMotion();
  const [minHeight, setMinHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const frozenStackRef = useRef(stack);
  const direction = useStackDirection(stack.length);

  const isOpen = stack.length > 0;

  // Freeze the stack when open so content doesn't shift during exit animation
  // AnimatePresence keeps children mounted during exit, so frozenStack is used then
  if (isOpen) {
    frozenStackRef.current = stack;
  }

  // Use frozen stack for rendering (preserves content during exit)
  const renderStack = frozenStackRef.current;
  const currentIndex = renderStack.length - 1;

  // DEBUG
  console.log("[DesktopOverlay]", {
    isOpen,
    stackLength: stack.length,
    frozenStackLength: frozenStackRef.current.length,
    renderStackLength: renderStack.length,
  });

  // Measure content height when it changes, reset on fresh open
  useLayoutEffect(() => {
    const isFreshOpen = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Reset minHeight on fresh open (not during push/pop)
    if (isFreshOpen) {
      setMinHeight(0);
    }

    if (contentRef.current) {
      const height = contentRef.current.offsetHeight;
      if (height > 0) {
        setMinHeight(height);
      }
    }
  }, [stack, isOpen]);

  // Use live stack for options checks (only when open)
  const currentItem = stack[stack.length - 1];
  const springTransition = shouldReduceMotion ? { duration: 0.01 } : iosSpring;
  const isPushing = direction === 1;

  const handleBackdropClick = useCallback(() => {
    if (currentItem?.options.closeOnBackdropClick !== false) {
      closeAll();
    }
  }, [currentItem?.options.closeOnBackdropClick, closeAll]);

  const handleEscapeKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentItem?.options.closeOnEscape !== false) {
        pop();
      }
    },
    [currentItem?.options.closeOnEscape, pop]
  );

  useLayoutEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isOpen, handleEscapeKey]);

  const handleExitComplete = useCallback(() => {
    console.log("[DesktopOverlay] handleExitComplete called");
    frozenStackRef.current = [];
  }, []);

  console.log("[DesktopOverlay] Rendering, isOpen:", isOpen);

  // Don't render Dialog at all when closed - this ensures clean unmount
  if (!isOpen && frozenStackRef.current.length === 0) {
    return null;
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <Dialog modal={false} open>
          <DialogPortal forceMount>
            {/* Backdrop - standalone clickable div */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/60"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={handleBackdropClick}
              transition={{ duration: 0.2 }}
            />

            {/* Dialog container */}
            <motion.div
              animate="visible"
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4"
              exit="exit"
              initial="hidden"
              variants={containerVariants}
            >
              <LayoutGroup>
                <motion.div
                  className="relative overflow-hidden rounded-xl border bg-background shadow-2xl ring-1 ring-black/5"
                  layout={isOpen}
                  style={{ minHeight: minHeight > 0 ? minHeight : "auto" }}
                  transition={iosSpring}
                >
                  {/* Content area - all items rendered persistently to preserve state */}
                  <div className="relative" ref={contentRef}>
                    {renderStack.map((item, index) => {
                      const isCurrent = index === currentIndex;
                      const isPrevious = index < currentIndex;

                      // For push onto existing stack: new current item slides in from right
                      // For first overlay (fresh open): no slide, dialog container handles entrance
                      // For pop: returning item is already at -35%, animates to 0%
                      const shouldSlideIn =
                        isCurrent && isPushing && renderStack.length > 1;
                      const initialValue = shouldSlideIn
                        ? { x: "100%", scale: 1, opacity: 1 }
                        : false;

                      return (
                        <motion.div
                          animate={{
                            x: getOverlayXPosition(isCurrent, isPrevious),
                            scale: isCurrent ? 1 : 0.94,
                            opacity: isCurrent ? 1 : 0,
                          }}
                          aria-hidden={!isCurrent}
                          className={cn(
                            "w-full",
                            isCurrent
                              ? "relative"
                              : "pointer-events-none absolute inset-0"
                          )}
                          initial={initialValue}
                          key={item.id}
                          transition={springTransition}
                        >
                          <item.component overlayId={item.id} {...item.props} />
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </LayoutGroup>
            </motion.div>
          </DialogPortal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

/**
 * Mobile drawer container with internal sliding content
 * Renders all stack items persistently in the same React tree location,
 * using CSS transforms to animate visibility while preserving component state
 */
function MobileOverlayContainer() {
  const { stack, closeAll, pop } = useOverlay();
  const shouldReduceMotion = useReducedMotion();
  const [minHeight, setMinHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const frozenStackRef = useRef(stack);
  const direction = useStackDirection(stack.length);

  const isOpen = stack.length > 0;

  // Freeze the stack when open so content doesn't shift during exit animation
  if (isOpen) {
    frozenStackRef.current = stack;
  }

  // Use frozen stack for rendering (preserves content during exit)
  const renderStack = frozenStackRef.current;
  const currentIndex = renderStack.length - 1;

  // Measure content height when it changes, reset on fresh open
  useLayoutEffect(() => {
    const isFreshOpen = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Reset minHeight on fresh open (not during push/pop)
    if (isFreshOpen) {
      setMinHeight(0);
    }

    if (contentRef.current) {
      const height = contentRef.current.offsetHeight;
      if (height > 0) {
        setMinHeight(height);
      }
    }
  }, [stack, isOpen]);

  // Use live stack for options checks (only when open)
  const currentItem = stack[stack.length - 1];
  const renderCurrentItem = renderStack[currentIndex];
  const springTransition = shouldReduceMotion ? { duration: 0.01 } : iosSpring;
  const isPushing = direction === 1;

  const handleBackdropClick = useCallback(() => {
    if (currentItem?.options.closeOnBackdropClick !== false) {
      closeAll();
    }
  }, [currentItem?.options.closeOnBackdropClick, closeAll]);

  const handleEscapeKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentItem?.options.closeOnEscape !== false) {
        pop();
      }
    },
    [currentItem?.options.closeOnEscape, pop]
  );

  useLayoutEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isOpen, handleEscapeKey]);

  const handleExitComplete = useCallback(() => {
    frozenStackRef.current = [];
  }, []);

  // Don't render Drawer at all when closed
  if (!isOpen && frozenStackRef.current.length === 0) {
    return null;
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <DrawerPrimitive.Root open>
          <DrawerPrimitive.Portal forceMount>
            {/* Backdrop */}
            <DrawerPrimitive.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-black/60"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={handleBackdropClick}
                transition={{ duration: 0.25 }}
              />
            </DrawerPrimitive.Overlay>

            {/* Drawer container */}
            <DrawerPrimitive.Content asChild forceMount>
              <motion.div
                animate="visible"
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col",
                  "rounded-t-2xl border-t bg-background shadow-2xl"
                )}
                exit="exit"
                initial="hidden"
                variants={drawerContainerVariants}
              >
                {/* Accessible title for screen readers */}
                <DrawerPrimitive.Title className="sr-only">
                  {renderCurrentItem?.options.title || "Dialog"}
                </DrawerPrimitive.Title>

                {/* Drag handle */}
                <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />

                {/* Content area with height animation */}
                <LayoutGroup>
                  <motion.div
                    className="relative flex-1 overflow-hidden"
                    layout={isOpen}
                    style={{ minHeight: minHeight > 0 ? minHeight : "auto" }}
                    transition={drawerSpring}
                  >
                    {/* Content wrapper - all items rendered persistently to preserve state */}
                    <div className="relative" ref={contentRef}>
                      {renderStack.map((item, index) => {
                        const isCurrent = index === currentIndex;
                        const isPrevious = index < currentIndex;

                        // For push onto existing stack: new current item slides in from right
                        // For first overlay (fresh open): no slide, drawer container handles entrance
                        // For pop: returning item is already at -35%, animates to 0%
                        const shouldSlideIn =
                          isCurrent && isPushing && renderStack.length > 1;
                        const initialValue = shouldSlideIn
                          ? { x: "100%", scale: 1, opacity: 1 }
                          : false;

                        return (
                          <motion.div
                            animate={{
                              x: getOverlayXPosition(isCurrent, isPrevious),
                              scale: isCurrent ? 1 : 0.94,
                              opacity: isCurrent ? 1 : 0,
                            }}
                            aria-hidden={!isCurrent}
                            className={cn(
                              "w-full",
                              isCurrent
                                ? "relative"
                                : "pointer-events-none absolute inset-0"
                            )}
                            initial={initialValue}
                            key={item.id}
                            transition={springTransition}
                          >
                            <item.component
                              overlayId={item.id}
                              {...item.props}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </LayoutGroup>

                {/* Safe area padding for iOS */}
                <div className="h-safe-area-inset-bottom" />
              </motion.div>
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Portal>
        </DrawerPrimitive.Root>
      )}
    </AnimatePresence>
  );
}

/**
 * Container component that renders overlays.
 * Place this once at the app level (inside OverlayProvider).
 */
export function OverlayContainer() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileOverlayContainer />;
  }

  return <DesktopOverlayContainer />;
}
