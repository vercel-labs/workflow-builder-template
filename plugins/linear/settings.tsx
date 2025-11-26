import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LinearSettings({
  apiKey,
  hasKey,
  onApiKeyChange,
  config,
  onConfigChange,
}: {
  apiKey: string;
  hasKey?: boolean;
  onApiKeyChange: (key: string) => void;
  showCard?: boolean;
  config?: Record<string, string>;
  onConfigChange?: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="linearApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API key is configured" : "Enter your Linear API key"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://linear.app/settings/account/security/api-keys/new"
            rel="noopener noreferrer"
            target="_blank"
          >
            Linear
          </a>
          .
        </p>
      </div>

      {onConfigChange && (
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="linearTeamId">
            Team ID (Optional)
          </Label>
          <Input
            className="bg-background"
            id="linearTeamId"
            onChange={(e) => onConfigChange("teamId", e.target.value)}
            placeholder="Will use first team if not specified"
            value={config?.teamId || ""}
          />
          <p className="text-muted-foreground text-sm">
            The team ID to create issues in. Leave blank to use your first
            team.
          </p>
        </div>
      )}
    </div>
  );
}

