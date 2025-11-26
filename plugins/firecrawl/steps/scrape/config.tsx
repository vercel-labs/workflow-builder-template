import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

/**
 * Scrape Config Fields Component
 * UI for configuring the scrape action
 */
export function ScrapeConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="url">URL</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="url"
        onChange={(value) => onUpdateConfig("url", value)}
        placeholder="https://example.com or {{NodeName.url}}"
        value={(config?.url as string) || ""}
      />
    </div>
  );
}

