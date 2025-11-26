import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirecrawlSettings({
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
        <Label className="ml-1" htmlFor="firecrawlApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="firecrawlApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API key is configured" : "Enter your Firecrawl API key"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://firecrawl.dev/app/api-keys"
            rel="noopener noreferrer"
            target="_blank"
          >
            Firecrawl
          </a>
          .
        </p>
      </div>
    </div>
  );
}
