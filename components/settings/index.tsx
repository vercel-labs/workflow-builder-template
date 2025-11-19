"use client";

import { useCallback, useEffect, useState } from "react";
import { get as getUser } from "@/app/actions/user/get";
import { update as updateUser } from "@/app/actions/user/update";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "../ui/spinner";
import { AccountSettings } from "./account-settings";

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

  const loadAccount = useCallback(async () => {
    try {
      const data = await getUser();
      setAccountName(data.name || "");
      setAccountEmail(data.email || "");
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadAccount();
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open, loadAll]);

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

  return (
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
              <TabsList className="mb-6 grid w-full grid-cols-1">
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="account">
                <AccountSettings
                  accountEmail={accountEmail}
                  accountName={accountName}
                  onEmailChange={setAccountEmail}
                  onNameChange={setAccountName}
                  onSave={saveAccount}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
