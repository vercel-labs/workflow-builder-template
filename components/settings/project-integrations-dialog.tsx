"use client";

import { useEffect, useState } from "react";
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
import { LinearSettings } from "./linear-settings";
import { ResendSettings } from "./resend-settings";
import { SlackSettings } from "./slack-settings";

interface ProjectIntegrations {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
}

interface ProjectIntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string | null;
}

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
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const loadIntegrations = async () => {
    if (!projectId) return;

    try {
      const data = await getProjectIntegrations(projectId);
      setIntegrations(data);

      // Only populate form fields if keys already exist
      setResendApiKey(data.hasResendKey ? "••••••••" : "");
      setResendFromEmail(data.resendFromEmail || "");
      setLinearApiKey(data.hasLinearKey ? "••••••••" : "");
      setSlackApiKey(data.hasSlackKey ? "••••••••" : "");
    } catch (error) {
      console.error("Failed to load project integrations:", error);
      toast.error("Failed to load integrations");
    }
  };

  useEffect(() => {
    if (open && projectId) {
      setLoading(true);
      loadIntegrations().finally(() => setLoading(false));
    }
  }, [open, projectId]);

  const handleSaveIntegrations = async (type: string) => {
    if (!projectId) return;

    setSavingIntegrations(true);
    try {
      const updates: Record<string, string | null> = {};

      if (type === "resend") {
        if (resendApiKey && resendApiKey !== "••••••••") {
          updates.resendApiKey = resendApiKey;
        }
        if (resendFromEmail) {
          updates.resendFromEmail = resendFromEmail;
        }
      } else if (type === "linear") {
        if (linearApiKey && linearApiKey !== "••••••••") {
          updates.linearApiKey = linearApiKey;
        }
      } else if (type === "slack") {
        if (slackApiKey && slackApiKey !== "••••••••") {
          updates.slackApiKey = slackApiKey;
        }
      }

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

  const handleRemoveIntegration = async (type: string) => {
    if (!projectId) return;

    setSavingIntegrations(true);
    try {
      const updates: Record<string, null> = {};

      if (type === "resend") {
        updates.resendApiKey = null;
        updates.resendFromEmail = null;
      } else if (type === "linear") {
        updates.linearApiKey = null;
      } else if (type === "slack") {
        updates.slackApiKey = null;
      }

      await updateProjectIntegrations(projectId, updates);
      await loadIntegrations();

      // Clear form fields
      if (type === "resend") {
        setResendApiKey("");
        setResendFromEmail("");
      } else if (type === "linear") {
        setLinearApiKey("");
      } else if (type === "slack") {
        setSlackApiKey("");
      }

      toast.success("Integration removed successfully");
    } catch (error) {
      console.error("Failed to remove integration:", error);
      toast.error("Failed to remove integration");
    } finally {
      setSavingIntegrations(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {projectName ? `${projectName} - Integrations` : "Project Integrations"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resend">Resend</TabsTrigger>
              <TabsTrigger value="linear">Linear</TabsTrigger>
              <TabsTrigger value="slack">Slack</TabsTrigger>
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
                    onClick={() => handleRemoveIntegration("resend")}
                    disabled={savingIntegrations}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  onClick={() => handleSaveIntegrations("resend")}
                  disabled={savingIntegrations}
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
                    onClick={() => handleRemoveIntegration("linear")}
                    disabled={savingIntegrations}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  onClick={() => handleSaveIntegrations("linear")}
                  disabled={savingIntegrations}
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
                    onClick={() => handleRemoveIntegration("slack")}
                    disabled={savingIntegrations}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  onClick={() => handleSaveIntegrations("slack")}
                  disabled={savingIntegrations}
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

