import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApifySettings({
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
        <Label className="ml-1" htmlFor="apifyApiKey">
          API Token
        </Label>
        <Input
          className="bg-background"
          id="apifyApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API token is configured" : "Enter your Apify API token"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API token from{" "}
          <a
            className="text-primary underline"
            href="https://console.apify.com/account/integrations"
            rel="noopener noreferrer"
            target="_blank"
          >
            Apify Console
          </a>
          .
        </p>
      </div>
    </div>
  );
}
