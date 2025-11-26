import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendSettings({
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
        <Label className="ml-1" htmlFor="resendApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="resendApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "API key is configured" : "Enter your Resend API key"
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://resend.com/api-keys"
            rel="noopener noreferrer"
            target="_blank"
          >
            Resend
          </a>
          .
        </p>
      </div>

      {onConfigChange && (
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="resendFromEmail">
            From Email
          </Label>
          <Input
            className="bg-background"
            id="resendFromEmail"
            onChange={(e) => onConfigChange("fromEmail", e.target.value)}
            placeholder="noreply@yourdomain.com"
            type="email"
            value={config?.fromEmail || ""}
          />
          <p className="text-muted-foreground text-sm">
            The email address that will appear as the sender.
          </p>
        </div>
      )}
    </div>
  );
}

