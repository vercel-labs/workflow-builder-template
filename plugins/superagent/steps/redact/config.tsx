import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Redact Config Fields Component
 * UI for configuring the Redact action
 */
export function RedactConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="redactInput">Input</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="redactInput"
          onChange={(value) => onUpdateConfig("input", value)}
          placeholder="Text to redact sensitive data from or {{NodeName.text}}"
          rows={4}
          value={(config?.input as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
          Enter the text or content to remove sensitive data (PII/PHI) from.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="entities">Custom Entities (Optional)</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="entities"
          onChange={(value) => {
            // Convert comma-separated string to array and store as JSON string
            const entities = value
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean);
            onUpdateConfig("entities", JSON.stringify(entities));
          }}
          placeholder="credit card numbers, email addresses, SSN"
          value={
            config?.entities
              ? (() => {
                  try {
                    const parsed = JSON.parse(config.entities as string);
                    return Array.isArray(parsed) ? parsed.join(", ") : "";
                  } catch {
                    return "";
                  }
                })()
              : ""
          }
        />
        <p className="text-muted-foreground text-xs">
          Comma-separated list of custom entity types to redact (e.g., "credit
          card numbers, email addresses").
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="format">Output Format</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("format", value)}
          value={(config?.format as string) || "json"}
        >
          <SelectTrigger className="w-full" id="format">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON (text output)</SelectItem>
            <SelectItem value="pdf">PDF (file output)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Choose JSON for text output or PDF for file output (when input is a
          PDF).
        </p>
      </div>
    </>
  );
}
