"use client";

import { useCallback, useEffect, useState } from "react";
import { get as getUser } from "@/app/actions/user/get";
import { update as updateUser } from "@/app/actions/user/update";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "../ui/spinner";
import { AccountSettings } from "./account-settings";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [loading, setLoading] = useState(true);

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

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
    try {
      await updateUser({ name: accountName, email: accountEmail });
      await loadAccount();
    } catch (error) {
      console.error("Failed to save account:", error);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Update your personal information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="mt-4">
            <AccountSettings
              accountEmail={accountEmail}
              accountName={accountName}
              onEmailChange={setAccountEmail}
              onNameChange={setAccountName}
              onSave={saveAccount}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
