"use client";

import { useEffect, useState } from "react";
import { create as createDataSource } from "@/app/actions/data-source/create";
import { deleteDataSource } from "@/app/actions/data-source/delete";
import { getAll as getAllDataSources } from "@/app/actions/data-source/get-all";
import { get as getUser } from "@/app/actions/user/get";
import { update as updateUser } from "@/app/actions/user/update";
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

type DataSource = {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "mongodb";
  connectionString: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [_savingAccount, setSavingAccount] = useState(false);

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
      await Promise.all([loadAccount(), loadDataSources()]);
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

  const loadDataSources = async () => {
    try {
      const data = await getAllDataSources();
      // Convert Date objects to ISO strings
      setDataSources(
        (data || []).map((source) => ({
          ...source,
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
        }))
      );
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

  const addDataSource = async () => {
    if (!(newSourceName && newSourceConnectionString)) {
      return;
    }

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
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="account">Account</TabsTrigger>
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
              onClick={() =>
                deleteSourceId && handleDeleteDataSource(deleteSourceId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
