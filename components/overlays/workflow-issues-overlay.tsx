"use client";

import { useSetAtom } from "jotai";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { integrationsVersionAtom } from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { ConfigureConnectionOverlay } from "./add-connection-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type BrokenReference = {
  nodeId: string;
  nodeLabel: string;
  brokenReferences: {
    fieldKey: string;
    fieldLabel: string;
    displayText: string;
  }[];
};

type MissingRequiredField = {
  nodeId: string;
  nodeLabel: string;
  missingFields: {
    fieldKey: string;
    fieldLabel: string;
  }[];
};

type MissingIntegration = {
  integrationType: IntegrationType;
  integrationLabel: string;
  nodeNames: string[];
};

type WorkflowIssues = {
  brokenReferences: BrokenReference[];
  missingRequiredFields: MissingRequiredField[];
  missingIntegrations: MissingIntegration[];
};

type WorkflowIssuesOverlayProps = OverlayComponentProps<{
  issues: WorkflowIssues;
  onGoToStep: (nodeId: string, fieldKey?: string) => void;
  onRunAnyway: () => void;
}>;

export function WorkflowIssuesOverlay({
  overlayId,
  issues,
  onGoToStep,
  onRunAnyway,
}: WorkflowIssuesOverlayProps) {
  const { push, closeAll } = useOverlay();
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);

  const { brokenReferences, missingRequiredFields, missingIntegrations } =
    issues;

  const totalIssues =
    brokenReferences.length +
    missingRequiredFields.length +
    missingIntegrations.length;

  const handleGoToStep = (nodeId: string, fieldKey?: string) => {
    closeAll();
    onGoToStep(nodeId, fieldKey);
  };

  const handleAddIntegration = (integrationType: IntegrationType) => {
    push(ConfigureConnectionOverlay, {
      type: integrationType,
      onSuccess: () => {
        // Increment version to trigger auto-fix for nodes
        setIntegrationsVersion((v) => v + 1);
      },
    });
  };

  const handleRunAnyway = () => {
    closeAll();
    onRunAnyway();
  };

  return (
    <Overlay
      actions={[
        { label: "Run Anyway", variant: "outline", onClick: handleRunAnyway },
        { label: "Cancel", onClick: closeAll },
      ]}
      overlayId={overlayId}
      title={`Workflow Issues (${totalIssues})`}
    >
      <div className="flex items-center gap-2 text-orange-500">
        <AlertTriangle className="size-5" />
        <p className="text-muted-foreground text-sm">
          This workflow has issues that may cause it to fail.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {/* Missing Connections Section */}
        {missingIntegrations.length > 0 && (
          <div className="space-y-1">
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Missing Connections
            </h4>
            {missingIntegrations.map((missing) => (
              <div
                className="flex items-center gap-3 py-1"
                key={missing.integrationType}
              >
                <IntegrationIcon
                  className="size-4 shrink-0"
                  integration={missing.integrationType}
                />
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {missing.integrationLabel}
                  </span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {missing.nodeNames.length > 3
                      ? `${missing.nodeNames.slice(0, 3).join(", ")} +${missing.nodeNames.length - 3} more`
                      : missing.nodeNames.join(", ")}
                  </span>
                </p>
                <Button
                  className="shrink-0"
                  onClick={() => handleAddIntegration(missing.integrationType)}
                  size="sm"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Broken References Section */}
        {brokenReferences.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Broken References
            </h4>
            {brokenReferences.map((broken) => (
              <div key={broken.nodeId}>
                <p className="font-medium text-sm">{broken.nodeLabel}</p>
                <div className="mt-1 space-y-0.5">
                  {broken.brokenReferences.map((ref, idx) => (
                    <div
                      className="flex items-center gap-3 py-0.5 pl-3"
                      key={`${broken.nodeId}-${ref.fieldKey}-${idx}`}
                    >
                      <p className="min-w-0 flex-1 text-muted-foreground text-sm">
                        <span className="font-mono">{ref.displayText}</span>
                        {" in "}
                        {ref.fieldLabel}
                      </p>
                      <Button
                        className="shrink-0"
                        onClick={() =>
                          handleGoToStep(broken.nodeId, ref.fieldKey)
                        }
                        size="sm"
                        variant="outline"
                      >
                        Fix
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Missing Required Fields Section */}
        {missingRequiredFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Missing Required Fields
            </h4>
            {missingRequiredFields.map((node) => (
              <div key={node.nodeId}>
                <p className="font-medium text-sm">{node.nodeLabel}</p>
                <div className="mt-1 space-y-0.5">
                  {node.missingFields.map((field) => (
                    <div
                      className="flex items-center gap-3 py-0.5 pl-3"
                      key={`${node.nodeId}-${field.fieldKey}`}
                    >
                      <p className="min-w-0 flex-1 text-muted-foreground text-sm">
                        {field.fieldLabel}
                      </p>
                      <Button
                        className="shrink-0"
                        onClick={() =>
                          handleGoToStep(node.nodeId, field.fieldKey)
                        }
                        size="sm"
                        variant="outline"
                      >
                        Fix
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}
