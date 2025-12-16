"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OverlayAction, OverlayFooterProps } from "./types";

/**
 * Render a single action button
 */
function ActionButton({ action }: { action: OverlayAction }) {
  return (
    <Button
      disabled={action.disabled || action.loading}
      onClick={action.onClick}
      variant={action.variant ?? "default"}
    >
      {action.loading && <Loader2 className="mr-2 size-4 animate-spin" />}
      {action.label}
    </Button>
  );
}

/**
 * Standardized footer component for overlays.
 * Renders action buttons in a consistent layout.
 */
export function OverlayFooter({
  actions,
  className,
  children,
}: OverlayFooterProps) {
  // If children are provided, render them directly
  if (children) {
    return (
      <div
        className={cn(
          "flex flex-col-reverse gap-2 p-6 pt-4 sm:flex-row sm:justify-end",
          className
        )}
      >
        {children}
      </div>
    );
  }

  // If no actions, render nothing
  if (!actions || actions.length === 0) {
    return null;
  }

  // Ghost buttons go on the left (additional actions like Delete)
  const leftActions = actions.filter((a) => a.variant === "ghost");

  // Right side: secondary (outline) then primary (default/destructive)
  const rightSecondary = actions.filter(
    (a) => a.variant === "outline" || a.variant === "secondary"
  );
  const rightPrimary = actions.filter(
    (a) => !a.variant || a.variant === "default" || a.variant === "destructive"
  );

  const hasLeftActions = leftActions.length > 0;
  const hasRightActions = rightSecondary.length > 0 || rightPrimary.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 p-6 pt-4 sm:flex-row",
        hasLeftActions && hasRightActions
          ? "sm:justify-between"
          : "sm:justify-end",
        className
      )}
    >
      {/* Ghost actions on the left */}
      {hasLeftActions && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {leftActions.map((action) => (
            <ActionButton action={action} key={action.label} />
          ))}
        </div>
      )}

      {/* Secondary + Primary actions on the right: [secondary] [primary] */}
      {hasRightActions && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {rightSecondary.map((action) => (
            <ActionButton action={action} key={action.label} />
          ))}
          {rightPrimary.map((action) => (
            <ActionButton action={action} key={action.label} />
          ))}
        </div>
      )}
    </div>
  );
}
