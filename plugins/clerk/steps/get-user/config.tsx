import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

/**
 * Get User Config Fields Component
 * UI for configuring the get user action
 */
export function GetUserConfigFields({
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
        <Label className="ml-1" htmlFor="userId">
          User ID
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="userId"
          onChange={(value) => onUpdateConfig("userId", value)}
          placeholder="user_... or {{NodeName.userId}}"
          value={(config?.userId as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          The Clerk user ID to fetch.
        </p>
      </div>
    </>
  );
}
