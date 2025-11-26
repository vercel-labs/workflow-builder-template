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
 * Create Ticket Config Fields Component
 * UI for configuring the create ticket action
 */
export function CreateTicketConfigFields({
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
        <Label className="ml-1" htmlFor="ticketTitle">
          Ticket Title
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="ticketTitle"
          onChange={(value) => onUpdateConfig("ticketTitle", value)}
          placeholder="Bug report or {{NodeName.title}}"
          value={(config?.ticketTitle as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="ticketDescription">
          Description
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="ticketDescription"
          onChange={(value) => onUpdateConfig("ticketDescription", value)}
          placeholder="Description. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.ticketDescription as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="ticketPriority">
          Priority
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("ticketPriority", value)}
          value={(config?.ticketPriority as string) || "2"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No Priority</SelectItem>
            <SelectItem value="1">Urgent</SelectItem>
            <SelectItem value="2">High</SelectItem>
            <SelectItem value="3">Normal</SelectItem>
            <SelectItem value="4">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

