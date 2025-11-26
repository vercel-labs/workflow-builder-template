import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SlackSettings({
  apiKey,
  hasKey,
  onApiKeyChange,
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
        <Label className="ml-1" htmlFor="slackApiKey">
          Bot Token
        </Label>
        <Input
          className="bg-background"
          id="slackApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "Bot token is configured" : "Enter your Slack Bot Token"
          }
          type="password"
          value={apiKey}
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
    </div>
  );
}

