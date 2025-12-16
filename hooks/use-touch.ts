import { useEffect, useState } from "react";

/**
 * Detects if the device has touch capability.
 * Useful for determining if auto-focus should be disabled (to avoid opening the keyboard).
 * Returns undefined during SSR/hydration, then true/false after mount.
 */
export function useIsTouch() {
  const [isTouch, setIsTouch] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0;

    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}
