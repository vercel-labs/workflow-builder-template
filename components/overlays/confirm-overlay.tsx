"use client";

import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayAction, OverlayActionVariant } from "./types";

type ConfirmOverlayProps = {
  overlayId: string;
  /** Title of the confirmation dialog */
  title?: string;
  /** Description/message to display */
  message: string;
  /** Text for the confirm button */
  confirmLabel?: string;
  /** Text for the cancel button */
  cancelLabel?: string;
  /** Variant for the confirm button */
  confirmVariant?: OverlayActionVariant;
  /** Whether the action is destructive (shows warning icon) */
  destructive?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Callback when cancelled */
  onCancel?: () => void;
};

/**
 * A reusable confirmation overlay.
 *
 * @example
 * ```tsx
 * const { open } = useOverlay();
 *
 * open(ConfirmOverlay, {
 *   title: "Delete Item",
 *   message: "Are you sure you want to delete this item? This action cannot be undone.",
 *   confirmLabel: "Delete",
 *   confirmVariant: "destructive",
 *   destructive: true,
 *   onConfirm: async () => {
 *     await deleteItem(id);
 *   },
 * });
 * ```
 */
export function ConfirmOverlay({
  overlayId,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmOverlayProps) {
  const { pop } = useOverlay();

  const handleCancel = () => {
    onCancel?.();
    pop();
  };

  const handleConfirm = async () => {
    await onConfirm();
    pop();
  };

  const actions: OverlayAction[] = [
    {
      label: cancelLabel,
      variant: "outline",
      onClick: handleCancel,
    },
    {
      label: confirmLabel,
      variant: destructive ? "destructive" : confirmVariant,
      onClick: handleConfirm,
    },
  ];

  return (
    <Overlay actions={actions} overlayId={overlayId} title={title}>
      <div className="flex gap-4">
        {destructive && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangleIcon className="size-5 text-destructive" />
          </div>
        )}
        <p
          className={cn("text-muted-foreground text-sm", destructive && "pt-2")}
        >
          {message}
        </p>
      </div>
    </Overlay>
  );
}
