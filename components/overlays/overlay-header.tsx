"use client";

import { ChevronLeftIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOverlay, useOverlayPosition } from "./overlay-provider";
import type { OverlayHeaderProps } from "./types";

/**
 * Standardized header component for overlays.
 * Automatically shows back button when overlay is pushed onto stack.
 */
export function OverlayHeader({
  title,
  description,
  showBackButton: showBackButtonProp,
  showCloseButton = true,
  onBack,
  onClose,
  className,
}: OverlayHeaderProps & { overlayId?: string }) {
  const { pop, closeAll } = useOverlay();

  // Determine if we should show back button based on stack position
  // This can be overridden by the prop
  const showBackButton = showBackButtonProp ?? false;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      pop();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeAll();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 p-6 pb-0",
        showBackButton && "pl-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button
            aria-label="Go back"
            className="size-8 shrink-0"
            onClick={handleBack}
            size="icon"
            variant="ghost"
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
        )}
        {title && (
          <h2 className="flex-1 font-semibold text-lg leading-none tracking-tight">
            {title}
          </h2>
        )}
        {showCloseButton && (
          <Button
            aria-label="Close"
            className="absolute top-4 right-4 size-8 shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={handleClose}
            size="icon"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}

/**
 * Smart header that automatically determines back button visibility
 * based on the overlay's position in the stack.
 */
export function SmartOverlayHeader({
  overlayId,
  showBackButton: showBackButtonProp,
  ...props
}: OverlayHeaderProps & { overlayId: string }) {
  const { showBackButton: stackShowBackButton } = useOverlayPosition(overlayId);

  return (
    <OverlayHeader
      {...props}
      showBackButton={showBackButtonProp ?? stackShowBackButton}
    />
  );
}
