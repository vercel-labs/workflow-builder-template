"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aiGatewayConsentCallbacksAtom,
  aiGatewayStatusAtom,
  aiGatewayTeamsAtom,
  aiGatewayTeamsLoadingAtom,
  showAiGatewayConsentModalAtom,
} from "@/lib/ai-gateway/state";
import { api } from "@/lib/api-client";

/**
 * Global AI Gateway consent modal.
 * Render this ONCE at app level. Control via atoms:
 * - Set callbacks with aiGatewayConsentCallbacksAtom
 * - Open modal with showAiGatewayConsentModalAtom
 */
export function AiGatewayConsentModal() {
  const [showModal, setShowModal] = useAtom(showAiGatewayConsentModalAtom);
  const callbacks = useAtomValue(aiGatewayConsentCallbacksAtom);
  const setStatus = useSetAtom(aiGatewayStatusAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Use pre-loaded teams from state
  const teams = useAtomValue(aiGatewayTeamsAtom);
  const teamsLoading = useAtomValue(aiGatewayTeamsLoadingAtom);

  // Reset state when modal opens
  useEffect(() => {
    if (showModal) {
      setLoading(false);
      setError(null);
      // Auto-select first team when teams are loaded
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [showModal, teams, selectedTeamId]);

  const completeConsent = useCallback(
    (integrationId: string) => {
      setLoading(false);
      setShowModal(false);
      callbacks.onConsent?.(integrationId);
    },
    [setShowModal, callbacks]
  );

  const handleConsent = useCallback(async () => {
    if (!selectedTeamId) {
      setError("Please select a team");
      return;
    }

    const selectedTeam = teams.find((t) => t.id === selectedTeamId);
    const teamName = selectedTeam?.name || "AI Gateway";

    setLoading(true);
    setError(null);

    try {
      const result = await api.aiGateway.consent(selectedTeamId, teamName);

      if (!result.success) {
        throw new Error(result.error || "Failed to set up AI Gateway");
      }

      const integrationId = result.managedIntegrationId || "";

      // Update status atom
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              hasManagedKey: result.hasManagedKey,
              managedIntegrationId: integrationId,
            }
          : null
      );

      // For managed connections, skip testing - the key was just created by Vercel
      // and is definitely valid. Testing would require decryption which adds complexity.
      completeConsent(integrationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setLoading(false);
    }
  }, [selectedTeamId, teams, setStatus, completeConsent]);

  const handleDecline = useCallback(() => {
    setShowModal(false);
    callbacks.onDecline?.();
  }, [setShowModal, callbacks]);

  const handleManualEntry = useCallback(() => {
    setShowModal(false);
    callbacks.onManualEntry?.();
  }, [setShowModal, callbacks]);

  return (
    <Dialog onOpenChange={(open) => !open && handleDecline()} open={showModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Use Your AI Gateway Credits
          </DialogTitle>
          <DialogDescription>
            Connect your Vercel account to use your own AI Gateway balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-muted-foreground text-sm">
            This will create an API key on your Vercel account that uses your AI
            Gateway credits for AI operations in workflows.
          </p>

          <div className="space-y-2">
            <Label htmlFor="team-select">Vercel Team</Label>
            {teamsLoading && teams.length === 0 ? (
              <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading teams...
              </div>
            ) : (
              <Select
                disabled={loading}
                onValueChange={setSelectedTeamId}
                value={selectedTeamId}
              >
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {team.avatar ? (
                          // biome-ignore lint/correctness/useImageSize: Avatar has fixed size
                          // biome-ignore lint/performance/noImgElement: External Vercel avatar
                          <img
                            alt=""
                            className="size-4 rounded-full bg-white"
                            src={team.avatar}
                          />
                        ) : (
                          <div className="size-4 rounded-full bg-white" />
                        )}
                        <span>{team.name}</span>
                        {team.isPersonal && (
                          <span className="text-muted-foreground text-xs">
                            (Personal)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-3">
              <X className="mt-0.5 size-4 shrink-0 text-red-500" />
              <p className="text-red-700 text-sm dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {callbacks.onManualEntry && (
            <Button
              disabled={loading}
              onClick={handleManualEntry}
              variant="ghost"
            >
              Enter manually
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              disabled={loading}
              onClick={handleDecline}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                (teamsLoading && teams.length === 0) ||
                !selectedTeamId
              }
              onClick={handleConsent}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Setting up..." : "Agree & Connect"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
