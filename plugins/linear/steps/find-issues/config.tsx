import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

/**
 * Find Issues Config Fields Component
 * UI for configuring the find issues action
 */
export function FindIssuesConfigFields({
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
        <Label className="ml-1" htmlFor="linearAssigneeId">
          Assignee (User ID)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearAssigneeId"
          onChange={(value) => onUpdateConfig("linearAssigneeId", value)}
          placeholder="user-id-123 or {{NodeName.userId}}"
          value={(config?.linearAssigneeId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearTeamId">
          Team ID (optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearTeamId"
          onChange={(value) => onUpdateConfig("linearTeamId", value)}
          placeholder="team-id-456 or {{NodeName.teamId}}"
          value={(config?.linearTeamId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearStatus">
          Status (optional)
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("linearStatus", value)}
          value={(config?.linearStatus as string) || "any"}
        >
          <SelectTrigger className="w-full" id="linearStatus">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearLabel">
          Label (optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearLabel"
          onChange={(value) => onUpdateConfig("linearLabel", value)}
          placeholder="bug, feature, etc. or {{NodeName.label}}"
          value={(config?.linearLabel as string) || ""}
        />
      </div>
    </>
  );
}

