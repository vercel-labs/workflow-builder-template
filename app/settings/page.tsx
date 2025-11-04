"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function SettingsPage() {
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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAccount = async () => {
    try {
      const response = await fetch("/api/user/account");
      if (response.ok) {
        const data = await response.json();
        setAccountName(data.name || "");
        setAccountEmail(data.email || "");
      }
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  };

  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/user/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
        setResendFromEmail(data.resendFromEmail || "");
        setVercelTeamId(data.vercelTeamId || "");
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  };

  const loadDataSources = async () => {
    try {
      const response = await fetch("/api/user/data-sources");
      if (response.ok) {
        const data = await response.json();
        setDataSources(data.dataSources || []);
      }
    } catch (error) {
      console.error("Failed to load data sources:", error);
    }
  };

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accountName, email: accountEmail }),
      });

      if (response.ok) {
        await loadAccount();
      }
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

      const response = await fetch("/api/user/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadIntegrations();
        setResendApiKey("");
        setLinearApiKey("");
        setSlackApiKey("");
        setVercelApiToken("");
      }
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
      const response = await fetch("/api/user/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSourceName,
          type: "postgresql",
          connectionString: newSourceConnectionString,
          isDefault: newSourceIsDefault,
        }),
      });

      if (response.ok) {
        await loadDataSources();
        setNewSourceName("");
        setNewSourceConnectionString("");
        setNewSourceIsDefault(false);
        setShowAddSource(false);
      }
    } catch (error) {
      console.error("Failed to add data source:", error);
    } finally {
      setSavingSource(false);
    }
  };

  const deleteDataSource = async (id: string) => {
    try {
      const response = await fetch(`/api/user/data-sources/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDataSources();
        setDeleteSourceId(null);
      }
    } catch (error) {
      console.error("Failed to delete data source:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <AppHeader showBackButton title="Settings" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader showBackButton title="Settings" />
      <div className="container mx-auto max-w-4xl p-8">
        <div className="mb-8">
          <h1 className="font-bold text-3xl">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account, integrations, and data sources
          </p>
        </div>

        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-6" value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Name</Label>
                  <Input
                    id="accountName"
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Your name"
                    value={accountName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountEmail">Email</Label>
                  <Input
                    id="accountEmail"
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    type="email"
                    value={accountEmail}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button disabled={savingAccount} onClick={saveAccount}>
                    {savingAccount ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Resend (Email)</CardTitle>
                <CardDescription>
                  Configure your Resend API key to send emails from workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resendApiKey">API Key</Label>
                  <Input
                    id="resendApiKey"
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder={
                      integrations?.hasResendKey
                        ? "API key is configured"
                        : "Enter your Resend API key"
                    }
                    type="password"
                    value={resendApiKey}
                  />
                  <p className="text-muted-foreground text-sm">
                    Get your API key from{" "}
                    <a
                      className="text-primary hover:underline"
                      href="https://resend.com/api-keys"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      resend.com/api-keys
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resendFromEmail">From Email</Label>
                  <Input
                    id="resendFromEmail"
                    onChange={(e) => setResendFromEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                    type="email"
                    value={resendFromEmail}
                  />
                  <p className="text-muted-foreground text-sm">
                    The email address that will appear as the sender
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linear</CardTitle>
                <CardDescription>
                  Configure your Linear API key to create and manage tickets
                  from workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linearApiKey">API Key</Label>
                  <Input
                    id="linearApiKey"
                    onChange={(e) => setLinearApiKey(e.target.value)}
                    placeholder={
                      integrations?.hasLinearKey
                        ? "API key is configured"
                        : "Enter your Linear API key"
                    }
                    type="password"
                    value={linearApiKey}
                  />
                  <p className="text-muted-foreground text-sm">
                    Get your API key from{" "}
                    <a
                      className="text-primary hover:underline"
                      href="https://linear.app/settings/account/security/api-keys/new"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Linear API Settings
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slack</CardTitle>
                <CardDescription>
                  Configure your Slack Bot Token to send messages from workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slackApiKey">Bot Token</Label>
                  <Input
                    id="slackApiKey"
                    onChange={(e) => setSlackApiKey(e.target.value)}
                    placeholder={
                      integrations?.hasSlackKey
                        ? "Bot token is configured"
                        : "Enter your Slack Bot Token"
                    }
                    type="password"
                    value={slackApiKey}
                  />
                  <p className="text-muted-foreground text-sm">
                    Create a Slack app and get your Bot Token from{" "}
                    <a
                      className="text-primary hover:underline"
                      href="https://api.slack.com/apps"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      api.slack.com/apps
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vercel</CardTitle>
                <CardDescription>
                  Configure your Vercel API token to manage projects and
                  deployments from workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vercelApiToken">API Token</Label>
                  <Input
                    id="vercelApiToken"
                    onChange={(e) => setVercelApiToken(e.target.value)}
                    placeholder={
                      integrations?.hasVercelToken
                        ? "API token is configured"
                        : "Enter your Vercel API token"
                    }
                    type="password"
                    value={vercelApiToken}
                  />
                  <p className="text-muted-foreground text-sm">
                    Get your API token from{" "}
                    <a
                      className="text-primary hover:underline"
                      href="https://vercel.com/account/tokens"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      vercel.com/account/tokens
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vercelTeamId">Team ID (Optional)</Label>
                  <Input
                    id="vercelTeamId"
                    onChange={(e) => setVercelTeamId(e.target.value)}
                    placeholder="team_xxxxxxxxxxxxx"
                    value={vercelTeamId}
                  />
                  <p className="text-muted-foreground text-sm">
                    Only required if you want to manage team projects instead of
                    personal projects
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    disabled={savingIntegrations}
                    onClick={saveIntegrations}
                  >
                    {savingIntegrations ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6" value="sources">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Data Sources</CardTitle>
                    <CardDescription>
                      Manage your database connections
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddSource(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Source
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dataSources.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No data sources configured. Add one to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dataSources.map((source) => (
                      <div
                        className="flex items-start justify-between rounded-lg border p-4"
                        key={source.id}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{source.name}</h3>
                            {source.isDefault && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-muted-foreground text-sm">
                            Type: {source.type.toUpperCase()}
                          </p>
                          <p className="mt-1 font-mono text-muted-foreground text-xs">
                            {source.connectionString}
                          </p>
                        </div>
                        <Button
                          onClick={() => setDeleteSourceId(source.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {showAddSource && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Data Source</CardTitle>
                  <CardDescription>
                    Configure a new database connection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceName">Name</Label>
                    <Input
                      id="sourceName"
                      onChange={(e) => setNewSourceName(e.target.value)}
                      placeholder="Production Database"
                      value={newSourceName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceType">Type</Label>
                    <Input
                      className="bg-muted"
                      disabled
                      id="sourceType"
                      value="PostgreSQL"
                    />
                    <p className="text-muted-foreground text-xs">
                      Currently only PostgreSQL is supported
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceConnectionString">
                      Connection String
                    </Label>
                    <Input
                      id="sourceConnectionString"
                      onChange={(e) =>
                        setNewSourceConnectionString(e.target.value)
                      }
                      placeholder="postgresql://user:password@host:port/database"
                      type="password"
                      value={newSourceConnectionString}
                    />
                    <p className="text-muted-foreground text-xs">
                      Format: postgresql://username:password@host:port/database
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      checked={newSourceIsDefault}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300"
                      id="sourceIsDefault"
                      onChange={(e) => setNewSourceIsDefault(e.target.checked)}
                      type="checkbox"
                    />
                    <Label
                      className="cursor-pointer font-normal"
                      htmlFor="sourceIsDefault"
                    >
                      Set as default data source
                    </Label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button disabled={savingSource} onClick={addDataSource}>
                      {savingSource ? "Adding..." : "Add Source"}
                    </Button>
                    <Button
                      onClick={() => setShowAddSource(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
              onClick={() => deleteSourceId && deleteDataSource(deleteSourceId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
