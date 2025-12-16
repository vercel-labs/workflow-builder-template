"use client";

import { Globe } from "lucide-react";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type MakePublicOverlayProps = OverlayComponentProps<{
  onConfirm: () => void;
}>;

export function MakePublicOverlay({
  overlayId,
  onConfirm,
}: MakePublicOverlayProps) {
  const { closeAll } = useOverlay();

  const handleConfirm = () => {
    closeAll();
    onConfirm();
  };

  return (
    <Overlay
      actions={[
        { label: "Cancel", variant: "outline", onClick: closeAll },
        { label: "Make Public", onClick: handleConfirm },
      ]}
      overlayId={overlayId}
      title="Make Workflow Public?"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="size-5 shrink-0" />
        <p className="text-sm">
          Making this workflow public means anyone with the link can:
        </p>
      </div>

      <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>View the workflow structure and steps</li>
        <li>See action types and configurations</li>
        <li>Duplicate the workflow to their own account</li>
      </ul>

      <p className="mt-4 font-medium text-foreground text-sm">
        The following will remain private:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>Your integration credentials (API keys, tokens)</li>
        <li>Execution logs and run history</li>
      </ul>
    </Overlay>
  );
}
