import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Send Email Config Fields Component
 * UI for configuring the send email action
 */
export function SendEmailConfigFields({
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
        <Label className="ml-1" htmlFor="emailTo">
          To (Email Address)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailTo"
          onChange={(value) => onUpdateConfig("emailTo", value)}
          placeholder="user@example.com or {{NodeName.email}}"
          value={(config?.emailTo as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailSubject">
          Subject
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailSubject"
          onChange={(value) => onUpdateConfig("emailSubject", value)}
          placeholder="Subject or {{NodeName.title}}"
          value={(config?.emailSubject as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailBody">
          Body
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="emailBody"
          onChange={(value) => onUpdateConfig("emailBody", value)}
          placeholder="Email content or {{NodeName.description}}"
          rows={5}
          value={(config?.emailBody as string) || ""}
        />
      </div>
    </>
  );
}

