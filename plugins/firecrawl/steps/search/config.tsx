import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

/**
 * Search Config Fields Component
 * UI for configuring the search action
 */
export function SearchConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="query">Search Query</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="query"
          onChange={(value) => onUpdateConfig("query", value)}
          placeholder="Search query or {{NodeName.query}}"
          value={(config?.query as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Result Limit</Label>
        <Input
          disabled={disabled}
          id="limit"
          min={1}
          onChange={(e) => onUpdateConfig("limit", e.target.value)}
          placeholder="10"
          type="number"
          value={(config?.limit as string) || ""}
        />
      </div>
    </>
  );
}

