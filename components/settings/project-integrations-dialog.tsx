"use client";

import { useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getProjectIntegrations } from "@/app/actions/vercel-project/get-integrations";
import { updateProjectIntegrations } from "@/app/actions/vercel-project/update-integrations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectIntegrationsAtom } from "@/lib/integrations-store";
import { Spinner } from "../ui/spinner";
import { AiGatewaySettings } from "./ai-gateway-settings";
import { DatabaseSettings } from "./database-settings";
import { IntegrationTabContent } from "./integration-tab-content";
import { LinearSettings } from "./linear-settings";
import { ResendSettings } from "./resend-settings";
import { SlackSettings } from "./slack-settings";

type ProjectIntegrations = {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  aiGatewayApiKey: string | null;
  databaseUrl: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
  hasAiGatewayKey: boolean;
  hasDatabaseUrl: boolean;
};

type ProjectIntegrationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string | null;
  workflowName: string | null;
  initialTab?: string;
  singleIntegrationMode?: boolean;
};

// Helper functions extracted outside component to reduce complexity
function buildResendUpdates(
  apiKey: string,
  fromEmail: string
): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (apiKey && apiKey !== "••••••••") {
    updates.resendApiKey = apiKey;
  }
  if (fromEmail) {
    updates.resendFromEmail = fromEmail;
  }
  return updates;
}

function buildLinearUpdates(apiKey: string): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (apiKey && apiKey !== "••••••••") {
    updates.linearApiKey = apiKey;
  }
  return updates;
}

function buildSlackUpdates(apiKey: string): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (apiKey && apiKey !== "••••••••") {
    updates.slackApiKey = apiKey;
  }
  return updates;
}

function buildAiGatewayUpdates(apiKey: string): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (apiKey && apiKey !== "••••••••") {
    updates.aiGatewayApiKey = apiKey;
  }
  return updates;
}

function buildDatabaseUpdates(url: string): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (url && url !== "••••••••") {
    updates.databaseUrl = url;
  }
  return updates;
}

function buildUpdatesForSave(
  type: string,
  state: {
    resendApiKey: string;
    resendFromEmail: string;
    linearApiKey: string;
    slackApiKey: string;
    aiGatewayApiKey: string;
    databaseUrl: string;
  }
): Record<string, string | null> {
  if (type === "resend") {
    return buildResendUpdates(state.resendApiKey, state.resendFromEmail);
  }
  if (type === "linear") {
    return buildLinearUpdates(state.linearApiKey);
  }
  if (type === "slack") {
    return buildSlackUpdates(state.slackApiKey);
  }
  if (type === "ai-gateway") {
    return buildAiGatewayUpdates(state.aiGatewayApiKey);
  }
  if (type === "database") {
    return buildDatabaseUpdates(state.databaseUrl);
  }
  return {};
}

function buildUpdatesForRemove(type: string): Record<string, null> {
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
  } else if (type === "database") {
    updates.databaseUrl = null;
  }

  return updates;
}

function clearFormFields(
  type: string,
  setters: {
    setResendApiKey: (value: string) => void;
    setResendFromEmail: (value: string) => void;
    setLinearApiKey: (value: string) => void;
    setSlackApiKey: (value: string) => void;
    setAiGatewayApiKey: (value: string) => void;
    setDatabaseUrl: (value: string) => void;
  }
) {
  if (type === "resend") {
    setters.setResendApiKey("");
    setters.setResendFromEmail("");
  } else if (type === "linear") {
    setters.setLinearApiKey("");
  } else if (type === "slack") {
    setters.setSlackApiKey("");
  } else if (type === "ai-gateway") {
    setters.setAiGatewayApiKey("");
  } else if (type === "database") {
    setters.setDatabaseUrl("");
  }
}

export function ProjectIntegrationsDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  initialTab = "resend",
  singleIntegrationMode = false,
}: ProjectIntegrationsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const setProjectIntegrations = useSetAtom(projectIntegrationsAtom);

  // Integrations state
  const [integrations, setIntegrations] = useState<ProjectIntegrations | null>(
    null
  );
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [linearApiKey, setLinearApiKey] = useState("");
  const [slackApiKey, setSlackApiKey] = useState("");
  const [aiGatewayApiKey, setAiGatewayApiKey] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const loadIntegrations = useCallback(async () => {
    if (!workflowId) {
      return;
    }

    try {
      const data = await getProjectIntegrations(workflowId);
      setIntegrations(data);
      setProjectIntegrations(data);

      // Only populate form fields if keys already exist
      setResendApiKey(data.hasResendKey ? "••••••••" : "");
      setResendFromEmail(data.resendFromEmail || "");
      setLinearApiKey(data.hasLinearKey ? "••••••••" : "");
      setSlackApiKey(data.hasSlackKey ? "••••••••" : "");
      setAiGatewayApiKey(data.hasAiGatewayKey ? "••••••••" : "");
      setDatabaseUrl(data.hasDatabaseUrl ? "••••••••" : "");
    } catch (error) {
      console.error("Failed to load workflow integrations:", error);
      toast.error("Failed to load integrations");
    }
  }, [workflowId, setProjectIntegrations]);

  useEffect(() => {
    if (open && workflowId) {
      setLoading(true);
      setActiveTab(initialTab);
      loadIntegrations().finally(() => setLoading(false));
    }
  }, [open, workflowId, loadIntegrations, initialTab]);

  const handleSaveIntegrations = async (type: string) => {
    if (!workflowId) {
      return;
    }

    setSavingIntegrations(true);
    try {
      const updates = buildUpdatesForSave(type, {
        resendApiKey,
        resendFromEmail,
        linearApiKey,
        slackApiKey,
        aiGatewayApiKey,
        databaseUrl,
      });
      await updateProjectIntegrations(workflowId, updates);
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
    if (!workflowId) {
      return;
    }

    setSavingIntegrations(true);
    try {
      const updates = buildUpdatesForRemove(type);
      await updateProjectIntegrations(workflowId, updates);
      await loadIntegrations();
      clearFormFields(type, {
        setResendApiKey,
        setResendFromEmail,
        setLinearApiKey,
        setSlackApiKey,
        setAiGatewayApiKey,
        setDatabaseUrl,
      });
      toast.success("Integration removed successfully");
    } catch (error) {
      console.error("Failed to remove integration:", error);
      toast.error("Failed to remove integration");
    } finally {
      setSavingIntegrations(false);
    }
  };

  // Get the integration title and description based on active tab
  const getIntegrationInfo = () => {
    switch (activeTab) {
      case "resend":
        return {
          title: "Resend",
          description:
            "Configure your Resend API key to send emails from workflows",
        };
      case "linear":
        return {
          title: "Linear",
          description:
            "Configure your Linear API key to create and manage tickets from workflows",
        };
      case "slack":
        return {
          title: "Slack",
          description:
            "Configure your Slack Bot Token to send messages from workflows",
        };
      case "ai-gateway":
        return {
          title: "AI Gateway",
          description:
            "Configure your AI Gateway API key to use AI models in workflows",
        };
      case "database":
        return {
          title: "Database Connection",
          description:
            "Configure your database connection URL for Database Query actions",
        };
      default:
        return {
          title: "Workflow Integrations",
          description: "",
        };
    }
  };

  const integrationInfo = getIntegrationInfo();

  let dialogTitle: string;
  if (singleIntegrationMode) {
    dialogTitle = integrationInfo.title;
  } else if (workflowName) {
    dialogTitle = `${workflowName} - Integrations`;
  } else {
    dialogTitle = "Workflow Integrations";
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          {singleIntegrationMode && integrationInfo.description && (
            <DialogDescription>{integrationInfo.description}</DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            {!singleIntegrationMode && (
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="resend">Resend</TabsTrigger>
                <TabsTrigger value="linear">Linear</TabsTrigger>
                <TabsTrigger value="slack">Slack</TabsTrigger>
                <TabsTrigger value="ai-gateway">AI Gateway</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="resend">
              <IntegrationTabContent
                hasKey={integrations?.hasResendKey}
                onRemove={() => handleRemoveIntegration("resend")}
                onSave={() => handleSaveIntegrations("resend")}
                saving={savingIntegrations}
              >
                <ResendSettings
                  apiKey={resendApiKey}
                  fromEmail={resendFromEmail}
                  hasKey={integrations?.hasResendKey}
                  onApiKeyChange={setResendApiKey}
                  onFromEmailChange={setResendFromEmail}
                  showCard={!singleIntegrationMode}
                />
              </IntegrationTabContent>
            </TabsContent>

            <TabsContent value="linear">
              <IntegrationTabContent
                hasKey={integrations?.hasLinearKey}
                onRemove={() => handleRemoveIntegration("linear")}
                onSave={() => handleSaveIntegrations("linear")}
                saving={savingIntegrations}
              >
                <LinearSettings
                  apiKey={linearApiKey}
                  hasKey={integrations?.hasLinearKey}
                  onApiKeyChange={setLinearApiKey}
                  showCard={!singleIntegrationMode}
                />
              </IntegrationTabContent>
            </TabsContent>

            <TabsContent value="slack">
              <IntegrationTabContent
                hasKey={integrations?.hasSlackKey}
                onRemove={() => handleRemoveIntegration("slack")}
                onSave={() => handleSaveIntegrations("slack")}
                saving={savingIntegrations}
              >
                <SlackSettings
                  apiKey={slackApiKey}
                  hasKey={integrations?.hasSlackKey}
                  onApiKeyChange={setSlackApiKey}
                  showCard={!singleIntegrationMode}
                />
              </IntegrationTabContent>
            </TabsContent>

            <TabsContent value="ai-gateway">
              <IntegrationTabContent
                hasKey={integrations?.hasAiGatewayKey}
                onRemove={() => handleRemoveIntegration("ai-gateway")}
                onSave={() => handleSaveIntegrations("ai-gateway")}
                saving={savingIntegrations}
              >
                <AiGatewaySettings
                  apiKey={aiGatewayApiKey}
                  hasKey={integrations?.hasAiGatewayKey}
                  onApiKeyChange={setAiGatewayApiKey}
                  showCard={!singleIntegrationMode}
                />
              </IntegrationTabContent>
            </TabsContent>

            <TabsContent value="database">
              <IntegrationTabContent
                hasKey={integrations?.hasDatabaseUrl}
                onRemove={() => handleRemoveIntegration("database")}
                onSave={() => handleSaveIntegrations("database")}
                saving={savingIntegrations}
              >
                <DatabaseSettings
                  databaseUrl={databaseUrl}
                  hasDatabaseUrl={integrations?.hasDatabaseUrl}
                  onDatabaseUrlChange={setDatabaseUrl}
                  showCard={!singleIntegrationMode}
                />
              </IntegrationTabContent>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
