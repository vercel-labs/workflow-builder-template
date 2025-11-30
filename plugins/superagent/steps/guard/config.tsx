import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Guard Config Fields Component
 * UI for configuring the Guard action
 */
export function GuardConfigFields({
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
        <Label htmlFor="guardInput">Input</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="guardInput"
          onChange={(value) => onUpdateConfig("input", value)}
          placeholder="Text to analyze for security threats or {{NodeName.text}}"
          rows={4}
          value={(config?.input as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
          Enter the text or content to analyze for security threats, prompt
          injection, or malicious content.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="onBlock">Behavior When Blocked</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("onBlock", value)}
          value={(config?.onBlock as string) || "continue"}
        >
          <SelectTrigger className="w-full" id="onBlock">
            <SelectValue placeholder="Select behavior" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="continue">
              Continue (return rejected status)
            </SelectItem>
            <SelectItem value="stop">Stop (halt workflow)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Choose whether to halt workflow execution or continue with a rejected
          status when threats are detected.
        </p>
      </div>
    </>
  );
}
