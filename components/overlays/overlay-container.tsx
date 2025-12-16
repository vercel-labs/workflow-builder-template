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
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
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

const reducedMotion = { duration: 0.01 };

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
 * Slide variants that use custom prop for direction
 * custom > 0: pushing (new from right, old exits left)
 * custom < 0: popping (new from left, old exits right)
 */
const createSlideVariants = (shouldReduceMotion: boolean | null): Variants => ({
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-35%",
    scale: direction > 0 ? 1 : 0.94,
    opacity: direction > 0 ? 1 : 0,
  }),
  center: {
    x: "0%",
    scale: 1,
    opacity: 1,
    transition: shouldReduceMotion ? reducedMotion : iosSpring,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-35%" : "100%",
    scale: direction > 0 ? 0.94 : 1,
    opacity: direction > 0 ? 0 : 1,
    transition: shouldReduceMotion ? reducedMotion : iosSpring,
  }),
});

/**
 * Hook to track direction of stack changes
 */
function useStackDirection(stackLength: number) {
  const prevLength = useRef(stackLength);
  const direction = useRef(1);

  // Compute synchronously during render for immediate value
  if (stackLength > prevLength.current) {
    direction.current = 1;
  } else if (stackLength < prevLength.current) {
    direction.current = -1;
  }

  // Update prevLength after render
  useLayoutEffect(() => {
    prevLength.current = stackLength;
  }, [stackLength]);

  return direction.current;
}

/**
 * Desktop dialog container with internal sliding content
 */
function DesktopOverlayContainer() {
  const { stack, closeAll, pop } = useOverlay();
  const shouldReduceMotion = useReducedMotion();
  const [minHeight, setMinHeight] = useState<number>(0);
  const direction = useStackDirection(stack.length);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const isOpen = stack.length > 0;

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

  const currentItem = stack[stack.length - 1];
  const slideVariants = createSlideVariants(shouldReduceMotion);

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

  return (
    <Dialog open={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <DialogPortal forceMount>
            {/* Backdrop */}
            <DialogOverlay asChild>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-black/60"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={handleBackdropClick}
                transition={{ duration: 0.2 }}
              />
            </DialogOverlay>

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
                  layout
                  style={{ minHeight: minHeight > 0 ? minHeight : "auto" }}
                  transition={iosSpring}
                >
                  {/* Content area - ref on wrapper div to avoid React 19 issues */}
                  <div ref={contentRef}>
                    <AnimatePresence
                      custom={direction}
                      initial={false}
                      mode="popLayout"
                    >
                      {currentItem && (
                        <motion.div
                          animate="center"
                          className="w-full"
                          custom={direction}
                          exit="exit"
                          initial="enter"
                          key={currentItem.id}
                          variants={slideVariants}
                        >
                          <currentItem.component
                            overlayId={currentItem.id}
                            {...currentItem.props}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </LayoutGroup>
            </motion.div>
          </DialogPortal>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

/**
 * Mobile drawer container with internal sliding content
 */
function MobileOverlayContainer() {
  const { stack, closeAll, pop } = useOverlay();
  const shouldReduceMotion = useReducedMotion();
  const [minHeight, setMinHeight] = useState<number>(0);
  const direction = useStackDirection(stack.length);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const isOpen = stack.length > 0;

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

  const currentItem = stack[stack.length - 1];
  const slideVariants = createSlideVariants(shouldReduceMotion);

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

  return (
    <DrawerPrimitive.Root open={isOpen}>
      <AnimatePresence>
        {isOpen && (
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
                  {currentItem?.options.title || "Dialog"}
                </DrawerPrimitive.Title>

                {/* Drag handle */}
                <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />

                {/* Content area with height animation */}
                <LayoutGroup>
                  <motion.div
                    className="relative flex-1 overflow-hidden"
                    layout
                    style={{ minHeight: minHeight > 0 ? minHeight : "auto" }}
                    transition={drawerSpring}
                  >
                    {/* Content wrapper */}
                    <div ref={contentRef}>
                      <AnimatePresence
                        custom={direction}
                        initial={false}
                        mode="popLayout"
                      >
                        {currentItem && (
                          <motion.div
                            animate="center"
                            className="w-full"
                            custom={direction}
                            exit="exit"
                            initial="enter"
                            key={currentItem.id}
                            variants={slideVariants}
                          >
                            <currentItem.component
                              overlayId={currentItem.id}
                              {...currentItem.props}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </LayoutGroup>

                {/* Safe area padding for iOS */}
                <div className="h-safe-area-inset-bottom" />
              </motion.div>
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Portal>
        )}
      </AnimatePresence>
    </DrawerPrimitive.Root>
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
