import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Send Slack Message Config Fields Component
 */
export function SendSlackMessageConfigFields({
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
        <Label className="ml-1" htmlFor="slackChannel">
          Channel
        </Label>
        <Input
          disabled={disabled}
          id="slackChannel"
          onChange={(e) => onUpdateConfig("slackChannel", e.target.value)}
          placeholder="#general or {{NodeName.channel}}"
          value={(config?.slackChannel as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="slackMessage">
          Message
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="slackMessage"
          onChange={(value) => onUpdateConfig("slackMessage", value)}
          placeholder="Your message. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.slackMessage as string) || ""}
        />
      </div>
    </>
  );
}

