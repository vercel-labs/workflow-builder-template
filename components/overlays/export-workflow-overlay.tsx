"use client";

import { Download, FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type ExportWorkflowOverlayProps = OverlayComponentProps<{
  onExport: () => void;
  isDownloading?: boolean;
}>;

export function ExportWorkflowOverlay({
  overlayId,
  onExport,
  isDownloading,
}: ExportWorkflowOverlayProps) {
  const { closeAll } = useOverlay();

  const handleExport = () => {
    closeAll();
    onExport();
  };

  return (
    <Overlay
      actions={[
        { label: "Cancel", variant: "outline", onClick: closeAll },
        {
          label: isDownloading ? "Exporting..." : "Export Project",
          onClick: handleExport,
          loading: isDownloading,
        },
      ]}
      overlayId={overlayId}
      title="Export Workflow as Code"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Download className="size-5" />
        <p className="text-sm">
          Export your workflow as a standalone Next.js project that you can run
          independently.
        </p>
      </div>

      <p className="mt-4 text-muted-foreground text-sm">
        This will generate a complete Next.js project containing your workflow
        code. Once exported, you can run your workflow outside of the Workflow
        Builder, deploy it to Vercel, or integrate it into your existing
        applications.
      </p>

      <Alert className="mt-4">
        <FlaskConical className="size-4" />
        <AlertTitle>Experimental Feature</AlertTitle>
        <AlertDescription className="block">
          This feature is experimental and may have limitations. If you
          encounter any issues, please{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            href="https://github.com/vercel-labs/workflow-builder-template/issues"
            rel="noopener noreferrer"
            target="_blank"
          >
            report them on GitHub
          </a>
          .
        </AlertDescription>
      </Alert>
    </Overlay>
  );
}
