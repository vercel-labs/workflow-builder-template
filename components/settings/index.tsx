"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "../ui/spinner";
import { AccountSettings } from "./account-settings";
import { DataSourcesSettings } from "./data-sources-settings";
import { LinearSettings } from "./linear-settings";
import { ResendSettings } from "./resend-settings";
import { SlackSettings } from "./slack-settings";
import { VercelSettings } from "./vercel-settings";
import { get as getUser } from "@/app/actions/user/get";
import { update as updateUser } from "@/app/actions/user/update";
import { get as getIntegrations } from "@/app/actions/integration/get";
import { update as updateIntegrations } from "@/app/actions/integration/update";
import { getAll as getAllDataSources } from "@/app/actions/data-source/get-all";
import { create as createDataSource } from "@/app/actions/data-source/create";
import { deleteDataSource } from "@/app/actions/data-source/delete";

interface Integrations {
  resendApiKey: string | null;
  resendFromEmail: string | null;
  linearApiKey: string | null;
  slackApiKey: string | null;
  vercelApiToken: string | null;
  vercelTeamId: string | null;
  hasResendKey: boolean;
  hasLinearKey: boolean;
  hasSlackKey: boolean;
  hasVercelToken: boolean;
}

interface DataSource {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "mongodb";
  connectionString: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [linearApiKey, setLinearApiKey] = useState("");
  const [slackApiKey, setSlackApiKey] = useState("");
  const [vercelApiToken, setVercelApiToken] = useState("");
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  // Data sources state
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceConnectionString, setNewSourceConnectionString] =
    useState("");
  const [newSourceIsDefault, setNewSourceIsDefault] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAccount(), loadIntegrations(), loadDataSources()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadAccount = async () => {
    try {
      const data = await getUser();
      setAccountName(data.name || "");
      setAccountEmail(data.email || "");
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  };

  const loadIntegrations = async () => {
    try {
      const data = await getIntegrations();
      setIntegrations(data);
      setResendFromEmail(data.resendFromEmail || "");
      setVercelTeamId(data.vercelTeamId || "");
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  };

  const loadDataSources = async () => {
    try {
      const data = await getAllDataSources();
      setDataSources(data || []);
    } catch (error) {
      console.error("Failed to load data sources:", error);
    }
  };

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      await updateUser({ name: accountName, email: accountEmail });
      await loadAccount();
    } catch (error) {
      console.error("Failed to save account:", error);
    } finally {
      setSavingAccount(false);
    }
  };

  const saveIntegrations = async () => {
    setSavingIntegrations(true);
    try {
      const updates: {
        resendApiKey?: string;
        resendFromEmail?: string;
        linearApiKey?: string;
        slackApiKey?: string;
        vercelApiToken?: string;
        vercelTeamId?: string;
      } = {};

      if (resendApiKey) updates.resendApiKey = resendApiKey;
      if (resendFromEmail) updates.resendFromEmail = resendFromEmail;
      if (linearApiKey) updates.linearApiKey = linearApiKey;
      if (slackApiKey) updates.slackApiKey = slackApiKey;
      if (vercelApiToken) updates.vercelApiToken = vercelApiToken;
      if (vercelTeamId) updates.vercelTeamId = vercelTeamId;

      await updateIntegrations(updates);
      await loadIntegrations();
      setResendApiKey("");
      setLinearApiKey("");
      setSlackApiKey("");
      setVercelApiToken("");
    } catch (error) {
      console.error("Failed to save integrations:", error);
    } finally {
      setSavingIntegrations(false);
    }
  };

  const addDataSource = async () => {
    if (!(newSourceName && newSourceConnectionString)) return;

    setSavingSource(true);
    try {
      await createDataSource({
        name: newSourceName,
        type: "postgresql",
        connectionString: newSourceConnectionString,
        isDefault: newSourceIsDefault,
      });
      await loadDataSources();
      setNewSourceName("");
      setNewSourceConnectionString("");
      setNewSourceIsDefault(false);
      setShowAddSource(false);
    } catch (error) {
      console.error("Failed to add data source:", error);
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteDataSource = async (id: string) => {
    try {
      await deleteDataSource(id);
      await loadDataSources();
      setDeleteSourceId(null);
    } catch (error) {
      console.error("Failed to delete data source:", error);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="mt-4">
              <Tabs onValueChange={setActiveTab} value={activeTab}>
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                </TabsList>

                <TabsContent className="space-y-6" value="account">
                  <AccountSettings
                    accountEmail={accountEmail}
                    accountName={accountName}
                    onEmailChange={setAccountEmail}
                    onNameChange={setAccountName}
                    onSave={saveAccount}
                  />
                </TabsContent>

                <TabsContent className="space-y-6" value="integrations">
                  <ResendSettings
                    apiKey={resendApiKey}
                    fromEmail={resendFromEmail}
                    hasKey={integrations?.hasResendKey}
                    onApiKeyChange={setResendApiKey}
                    onFromEmailChange={setResendFromEmail}
                  />
                  <LinearSettings
                    apiKey={linearApiKey}
                    hasKey={integrations?.hasLinearKey}
                    onApiKeyChange={setLinearApiKey}
                  />
                  <SlackSettings
                    apiKey={slackApiKey}
                    hasKey={integrations?.hasSlackKey}
                    onApiKeyChange={setSlackApiKey}
                  />
                  <VercelSettings
                    apiToken={vercelApiToken}
                    hasToken={integrations?.hasVercelToken}
                    onApiTokenChange={setVercelApiToken}
                    onTeamIdChange={setVercelTeamId}
                    teamId={vercelTeamId}
                  />
                  <div className="flex justify-end pt-4">
                    <Button
                      disabled={savingIntegrations}
                      onClick={saveIntegrations}
                    >
                      {savingIntegrations ? "Saving..." : "Save All Integrations"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent className="space-y-6" value="sources">
                  <DataSourcesSettings
                    dataSources={dataSources}
                    newSourceConnectionString={newSourceConnectionString}
                    newSourceIsDefault={newSourceIsDefault}
                    newSourceName={newSourceName}
                    onAddSource={addDataSource}
                    onDeleteSource={setDeleteSourceId}
                    onNewSourceConnectionStringChange={
                      setNewSourceConnectionString
                    }
                    onNewSourceIsDefaultChange={setNewSourceIsDefault}
                    onNewSourceNameChange={setNewSourceName}
                    onShowAddSource={setShowAddSource}
                    savingSource={savingSource}
                    showAddSource={showAddSource}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteSourceId(null)}
        open={deleteSourceId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this data source? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteSourceId && handleDeleteDataSource(deleteSourceId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
