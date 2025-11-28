import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Send Message Config Fields Component
 * UI for configuring the send message action
 */
export function SendMessageConfigFields({
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
        <Label className="ml-1" htmlFor="chatId">
          Chat ID
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="chatId"
          onChange={(value) => onUpdateConfig("chatId", value)}
          placeholder="chat_123 or {{CreateChat.chatId}}"
          value={(config?.chatId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="message">
          Message
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="message"
          onChange={(value) => onUpdateConfig("message", value)}
          placeholder="Add dark mode"
          rows={4}
          value={(config?.message as string) || ""}
        />
      </div>
    </>
  );
}

