"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayAction } from "./types";

type AlertVariant = "info" | "success" | "warning" | "error";

type AlertOverlayProps = {
  overlayId: string;
  /** Title of the alert */
  title?: string;
  /** Message to display */
  message: string;
  /** Visual variant */
  variant?: AlertVariant;
  /** Text for the dismiss button */
  dismissLabel?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
};

const variantConfig: Record<
  AlertVariant,
  {
    icon: typeof InfoIcon;
    iconClass: string;
    bgClass: string;
  }
> = {
  info: {
    icon: InfoIcon,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
  success: {
    icon: CheckCircle2Icon,
    iconClass: "text-green-500",
    bgClass: "bg-green-500/10",
  },
  warning: {
    icon: AlertTriangleIcon,
    iconClass: "text-yellow-500",
    bgClass: "bg-yellow-500/10",
  },
  error: {
    icon: XCircleIcon,
    iconClass: "text-red-500",
    bgClass: "bg-red-500/10",
  },
};

/**
 * A reusable alert overlay for displaying messages.
 *
 * @example
 * ```tsx
 * const { open } = useOverlay();
 *
 * // Success alert
 * open(AlertOverlay, {
 *   title: "Success",
 *   message: "Your changes have been saved.",
 *   variant: "success",
 * });
 *
 * // Error alert
 * open(AlertOverlay, {
 *   title: "Error",
 *   message: "Something went wrong. Please try again.",
 *   variant: "error",
 * });
 * ```
 */
export function AlertOverlay({
  overlayId,
  title,
  message,
  variant = "info",
  dismissLabel = "OK",
  onDismiss,
}: AlertOverlayProps) {
  const { pop } = useOverlay();

  const handleDismiss = () => {
    onDismiss?.();
    pop();
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const actions: OverlayAction[] = [
    {
      label: dismissLabel,
      onClick: handleDismiss,
    },
  ];

  // Default titles based on variant
  const displayTitle =
    title ??
    {
      info: "Information",
      success: "Success",
      warning: "Warning",
      error: "Error",
    }[variant];

  return (
    <Overlay actions={actions} overlayId={overlayId} title={displayTitle}>
      <div className="flex gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            config.bgClass
          )}
        >
          <Icon className={cn("size-5", config.iconClass)} />
        </div>
        <p className="pt-2 text-muted-foreground text-sm">{message}</p>
      </div>
    </Overlay>
  );
}
