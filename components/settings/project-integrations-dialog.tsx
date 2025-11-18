"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getProjectIntegrations } from "@/app/actions/vercel-project/get-integrations";
import { updateProjectIntegrations } from "@/app/actions/vercel-project/update-integrations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "../ui/spinner";
import { AiGatewaySettings } from "./ai-gateway-settings";
import { LinearSettings } from "./linear-settings";
import { ResendSettings } from "./resend-settings";
import { SlackSettings } from "./slack-settings";

type ProjectIntegrations = {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  aiGatewayApiKey: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
  hasAiGatewayKey: boolean;
};

type ProjectIntegrationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string | null;
};

export function ProjectIntegrationsDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ProjectIntegrationsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resend");

  // Integrations state
  const [integrations, setIntegrations] = useState<ProjectIntegrations | null>(
    null
  );
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [linearApiKey, setLinearApiKey] = useState("");
  const [slackApiKey, setSlackApiKey] = useState("");
  const [aiGatewayApiKey, setAiGatewayApiKey] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const loadIntegrations = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      const data = await getProjectIntegrations(projectId);
      setIntegrations(data);

      // Only populate form fields if keys already exist
      setResendApiKey(data.hasResendKey ? "••••••••" : "");
      setResendFromEmail(data.resendFromEmail || "");
      setLinearApiKey(data.hasLinearKey ? "••••••••" : "");
      setSlackApiKey(data.hasSlackKey ? "••••••••" : "");
      setAiGatewayApiKey(data.hasAiGatewayKey ? "••••••••" : "");
    } catch (error) {
      console.error("Failed to load project integrations:", error);
      toast.error("Failed to load integrations");
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) {
      setLoading(true);
      loadIntegrations().finally(() => setLoading(false));
    }
  }, [open, projectId, loadIntegrations]);

  const buildResendUpdates = (
    apiKey: string,
    fromEmail: string
  ): Record<string, string | null> => {
    const updates: Record<string, string | null> = {};
    if (apiKey && apiKey !== "••••••••") {
      updates.resendApiKey = apiKey;
    }
    if (fromEmail) {
      updates.resendFromEmail = fromEmail;
    }
    return updates;
  };

  const buildLinearUpdates = (
    apiKey: string
  ): Record<string, string | null> => {
    const updates: Record<string, string | null> = {};
    if (apiKey && apiKey !== "••••••••") {
      updates.linearApiKey = apiKey;
    }
    return updates;
  };

  const buildSlackUpdates = (apiKey: string): Record<string, string | null> => {
    const updates: Record<string, string | null> = {};
    if (apiKey && apiKey !== "••••••••") {
      updates.slackApiKey = apiKey;
    }
    return updates;
  };

  const buildAiGatewayUpdates = (
    apiKey: string
  ): Record<string, string | null> => {
    const updates: Record<string, string | null> = {};
    if (apiKey && apiKey !== "••••••••") {
      updates.aiGatewayApiKey = apiKey;
    }
    return updates;
  };

  const buildUpdatesForSave = (type: string): Record<string, string | null> => {
    if (type === "resend") {
      return buildResendUpdates(resendApiKey, resendFromEmail);
    }
    if (type === "linear") {
      return buildLinearUpdates(linearApiKey);
    }
    if (type === "slack") {
      return buildSlackUpdates(slackApiKey);
    }
    if (type === "ai-gateway") {
      return buildAiGatewayUpdates(aiGatewayApiKey);
    }
    return {};
  };

  const handleSaveIntegrations = async (type: string) => {
    if (!projectId) {
      return;
    }

    setSavingIntegrations(true);
    try {
      const updates = buildUpdatesForSave(type);
      await updateProjectIntegrations(projectId, updates);
      await loadIntegrations();
      toast.success("Integrations updated successfully");
    } catch (error) {
      console.error("Failed to save integrations:", error);
      toast.error("Failed to save integrations");
    } finally {
      setSavingIntegrations(false);
    }
  };

  const buildUpdatesForRemove = (type: string): Record<string, null> => {
    const updates: Record<string, null> = {};

    if (type === "resend") {
      updates.resendApiKey = null;
      updates.resendFromEmail = null;
    } else if (type === "linear") {
      updates.linearApiKey = null;
    } else if (type === "slack") {
      updates.slackApiKey = null;
    } else if (type === "ai-gateway") {
      updates.aiGatewayApiKey = null;
    }

    return updates;
  };

  const clearFormFields = (type: string) => {
    if (type === "resend") {
      setResendApiKey("");
      setResendFromEmail("");
    } else if (type === "linear") {
      setLinearApiKey("");
    } else if (type === "slack") {
      setSlackApiKey("");
    } else if (type === "ai-gateway") {
      setAiGatewayApiKey("");
    }
  };

  const handleRemoveIntegration = async (type: string) => {
    if (!projectId) {
      return;
    }

    setSavingIntegrations(true);
    try {
      const updates = buildUpdatesForRemove(type);
      await updateProjectIntegrations(projectId, updates);
      await loadIntegrations();
      clearFormFields(type);
      toast.success("Integration removed successfully");
    } catch (error) {
      console.error("Failed to remove integration:", error);
      toast.error("Failed to remove integration");
    } finally {
      setSavingIntegrations(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {projectName
              ? `${projectName} - Integrations`
              : "Project Integrations"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resend">Resend</TabsTrigger>
              <TabsTrigger value="linear">Linear</TabsTrigger>
              <TabsTrigger value="slack">Slack</TabsTrigger>
              <TabsTrigger value="ai-gateway">AI Gateway</TabsTrigger>
            </TabsList>

            <TabsContent value="resend">
              <ResendSettings
                apiKey={resendApiKey}
                fromEmail={resendFromEmail}
                hasKey={integrations?.hasResendKey}
                onApiKeyChange={setResendApiKey}
                onFromEmailChange={setResendFromEmail}
              />
              <div className="mt-4 flex justify-end gap-2">
                {integrations?.hasResendKey && (
                  <Button
                    disabled={savingIntegrations}
                    onClick={() => handleRemoveIntegration("resend")}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  disabled={savingIntegrations}
                  onClick={() => handleSaveIntegrations("resend")}
                >
                  {savingIntegrations ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="linear">
              <LinearSettings
                apiKey={linearApiKey}
                hasKey={integrations?.hasLinearKey}
                onApiKeyChange={setLinearApiKey}
              />
              <div className="mt-4 flex justify-end gap-2">
                {integrations?.hasLinearKey && (
                  <Button
                    disabled={savingIntegrations}
                    onClick={() => handleRemoveIntegration("linear")}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  disabled={savingIntegrations}
                  onClick={() => handleSaveIntegrations("linear")}
                >
                  {savingIntegrations ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="slack">
              <SlackSettings
                apiKey={slackApiKey}
                hasKey={integrations?.hasSlackKey}
                onApiKeyChange={setSlackApiKey}
              />
              <div className="mt-4 flex justify-end gap-2">
                {integrations?.hasSlackKey && (
                  <Button
                    disabled={savingIntegrations}
                    onClick={() => handleRemoveIntegration("slack")}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  disabled={savingIntegrations}
                  onClick={() => handleSaveIntegrations("slack")}
                >
                  {savingIntegrations ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ai-gateway">
              <AiGatewaySettings
                apiKey={aiGatewayApiKey}
                hasKey={integrations?.hasAiGatewayKey}
                onApiKeyChange={setAiGatewayApiKey}
              />
              <div className="mt-4 flex justify-end gap-2">
                {integrations?.hasAiGatewayKey && (
                  <Button
                    disabled={savingIntegrations}
                    onClick={() => handleRemoveIntegration("ai-gateway")}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  disabled={savingIntegrations}
                  onClick={() => handleSaveIntegrations("ai-gateway")}
                >
                  {savingIntegrations ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
