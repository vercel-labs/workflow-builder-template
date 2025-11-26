import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AiGatewaySettings({
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
        <Label className="ml-1" htmlFor="aiGatewayApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="aiGatewayApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API key is configured" : "Enter your AI Gateway API key"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://vercel.com/docs/ai-gateway/getting-started"
            rel="noopener noreferrer"
            target="_blank"
          >
            Vercel AI Gateway
          </a>
          .
        </p>
      </div>
    </div>
  );
}
