"use client";

import { cn } from "@/lib/utils";
import { OverlayFooter } from "./overlay-footer";
import { SmartOverlayHeader } from "./overlay-header";
import type { OverlayProps } from "./types";

type OverlayComponentProps = OverlayProps & {
  /** The overlay's unique ID (passed automatically by the container) */
  overlayId: string;
};

/**
 * Base Overlay component for creating new overlays.
 * Provides consistent structure with header, content area, and footer.
 *
 * @example
 * ```tsx
 * function SettingsOverlay({ overlayId }: { overlayId: string }) {
 *   const { pop } = useOverlay();
 *
 *   return (
 *     <Overlay
 *       overlayId={overlayId}
 *       title="Settings"
 *       description="Manage your preferences"
 *       actions={[
 *         { label: "Cancel", variant: "outline", onClick: pop },
 *         { label: "Save", onClick: handleSave },
 *       ]}
 *     >
 *       <SettingsContent />
 *     </Overlay>
 *   );
 * }
 * ```
 */
export function Overlay({
  overlayId,
  title,
  description,
  actions,
  children,
  className,
}: OverlayComponentProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header with smart back button detection */}
      {(title || description) && (
        <SmartOverlayHeader
          description={description}
          overlayId={overlayId}
          title={title}
        />
      )}

      {/* Content area */}
      {children && <div className="flex-1 overflow-y-auto p-6">{children}</div>}

      {/* Footer with actions */}
      <OverlayFooter actions={actions} />
    </div>
  );
}
