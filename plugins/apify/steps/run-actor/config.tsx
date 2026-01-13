import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeJson } from "@/components/ui/template-badge-json";

/**
 * Run Actor Config Fields Component
 * UI for configuring the run actor action
 */
export function RunActorConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="actorId">Actor (ID or name)</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="actorId"
          onChange={(value) => onUpdateConfig("actorId", value)}
          placeholder="apify/web-scraper or {{NodeName.actorId}}"
          value={(config?.actorId as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
            Enter an Actor ID or name (e.g., apify/website-content-crawler). Browse all available Actors in the <a
            href='https://apify.com/store'
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
        >
            Apify Store
        </a>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actorInput">Actor Input (JSON)</Label>
        <TemplateBadgeJson
          disabled={disabled}
          id="actorInput"
          placeholder='{"startUrls": [{"url": "https://example.com"}]}'
          rows={6}
          onChange={(value) => onUpdateConfig("actorInput", value)}
          value={(config?.actorInput as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
          JSON input for the Actor. Check the Actor's documentation for required
          fields.
        </p>
      </div>
    </div>
  );
}
