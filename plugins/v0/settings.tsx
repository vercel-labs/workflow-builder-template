import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function V0Settings({
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
        <Label className="ml-1" htmlFor="v0ApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="v0ApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API key is configured" : "Enter your v0 API key"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://v0.dev/chat/settings/keys"
            rel="noopener noreferrer"
            target="_blank"
          >
            v0.dev
          </a>
          .
        </p>
      </div>
    </div>
  );
}

