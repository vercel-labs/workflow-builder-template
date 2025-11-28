import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClerkSettings({
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
        <Label className="ml-1" htmlFor="clerkSecretKey">
          Secret Key
        </Label>
        <Input
          className="bg-background"
          id="clerkSecretKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={
            hasKey ? "Secret key is configured" : "sk_live_..."
          }
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your secret key from{" "}
          <a
            className="text-primary underline"
            href="https://dashboard.clerk.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Clerk Dashboard
          </a>
          {" "}under API Keys.
        </p>
      </div>
    </div>
  );
}
