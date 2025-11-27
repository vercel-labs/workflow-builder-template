import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

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
        <Label htmlFor="actorId">Actor ID or Name</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="actorId"
          onChange={(value) => onUpdateConfig("actorId", value)}
          placeholder="apify/web-scraper or {{NodeName.actorId}}"
          value={(config?.actorId as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
          Enter the Actor ID (e.g., apify/web-scraper) or use a template
          reference.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actorInput">Actor Input (JSON)</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="actorInput"
          onChange={(value) => {
            try {
              const parsed = JSON.parse(value);
              onUpdateConfig("actorInput", parsed);
              onUpdateConfig("actorInputRaw", value);
            } catch {
              // Store as string if not valid JSON yet (user is still typing)
              onUpdateConfig("actorInputRaw", value);
            }
          }}
          placeholder='{"startUrls": [{"url": "https://example.com"}]}'
          rows={6}
          value={
            (config?.actorInputRaw as string) ||
            (config?.actorInput
              ? JSON.stringify(config.actorInput, null, 2)
              : "")
          }
        />
        <p className="text-muted-foreground text-xs">
          JSON input for the Actor. Check the Actor's documentation for required
          fields.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          disabled={disabled}
          id="waitForFinish"
          checked={(config?.waitForFinish as boolean) !== false}
          onChange={(e) => onUpdateConfig("waitForFinish", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="waitForFinish" className="text-sm font-medium cursor-pointer">
            Wait for results
          </Label>
          <p className="text-muted-foreground text-xs">
            Wait for the Actor to finish and return dataset items
          </p>
        </div>
      </div>
    </div>
  );
}
