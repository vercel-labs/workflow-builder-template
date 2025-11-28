import { Label } from "@/components/ui/label";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Create Chat Config Fields Component
 * UI for configuring the create chat action
 */
export function CreateChatConfigFields({
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
        <Label className="ml-1" htmlFor="message">
          Message
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="message"
          onChange={(value) => onUpdateConfig("message", value)}
          placeholder="Create a landing page for a new product"
          rows={4}
          value={(config?.message as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="system">
          System Prompt (Optional)
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="system"
          onChange={(value) => onUpdateConfig("system", value)}
          placeholder="You are an expert coder"
          rows={3}
          value={(config?.system as string) || ""}
        />
      </div>
    </>
  );
}

