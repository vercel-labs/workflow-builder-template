import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDownIcon, InfoIcon } from "lucide-react";

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
      <div className="text-muted-foreground border-border bg-muted/30 rounded-md border px-3 py-2 text-sm">
        Email fields support <code className="bg-muted rounded px-1">Name &lt;email&gt;</code> format and template variables.
      </div>
      <div className="space-y-2">
        <div className="ml-1 flex items-center gap-1">
          <Label htmlFor="emailFrom">From</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Overrides Default Sender</TooltipContent>
          </Tooltip>
        </div>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailFrom"
          onChange={(value) => onUpdateConfig("emailFrom", value)}
          placeholder="noreply@example.com"
          value={(config?.emailFrom as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailTo">
          To
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailTo"
          onChange={(value) => onUpdateConfig("emailTo", value)}
          placeholder="recipient@example.com"
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
      <Collapsible>
        <CollapsibleTrigger className="group border-border hover:bg-muted/50 data-[state=open]:bg-muted/50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-all">
          <span className="text-muted-foreground">Optional Fields</span>
          <ChevronDownIcon className="text-muted-foreground size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border bg-muted/30 mt-4 space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="ml-1" htmlFor="emailCc">
                  CC
                </Label>
                <TemplateBadgeInput
                  disabled={disabled}
                  id="emailCc"
                  onChange={(value) => onUpdateConfig("emailCc", value)}
                  placeholder="cc@example.com"
                  value={(config?.emailCc as string) || ""}
                />
              </div>
              <div className="space-y-2">
                <Label className="ml-1" htmlFor="emailBcc">
                  BCC
                </Label>
                <TemplateBadgeInput
                  disabled={disabled}
                  id="emailBcc"
                  onChange={(value) => onUpdateConfig("emailBcc", value)}
                  placeholder="bcc@example.com"
                  value={(config?.emailBcc as string) || ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="ml-1" htmlFor="emailReplyTo">
                Reply-To
              </Label>
              <TemplateBadgeInput
                disabled={disabled}
                id="emailReplyTo"
                onChange={(value) => onUpdateConfig("emailReplyTo", value)}
                placeholder="reply@example.com"
                value={(config?.emailReplyTo as string) || ""}
              />
            </div>
            <div className="space-y-2">
              <DateInput
                label="Schedule At"
                description="Your email will send on"
                value={(config?.emailScheduledAt as string) || ""}
                onChange={(value) => onUpdateConfig("emailScheduledAt", value)}
                disabled={disabled}
                maxDays={30}
              />
            </div>
            <div className="space-y-2">
              <Label className="ml-1" htmlFor="emailTopicId">
                Topic ID
              </Label>
              <TemplateBadgeInput
                disabled={disabled}
                id="emailTopicId"
                onChange={(value) => onUpdateConfig("emailTopicId", value)}
                placeholder="topic_abc123"
                value={(config?.emailTopicId as string) || ""}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

