import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Update User Config Fields Component
 * UI for configuring the update user action
 */
export function UpdateUserConfigFields({
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
          The Clerk user ID to update.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="ml-1" htmlFor="firstName">
          First Name (Optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="firstName"
          onChange={(value) => onUpdateConfig("firstName", value)}
          placeholder="John or {{NodeName.firstName}}"
          value={(config?.firstName as string) || ""}
        />
      </div>

      <div className="space-y-2">
        <Label className="ml-1" htmlFor="lastName">
          Last Name (Optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="lastName"
          onChange={(value) => onUpdateConfig("lastName", value)}
          placeholder="Doe or {{NodeName.lastName}}"
          value={(config?.lastName as string) || ""}
        />
      </div>

      <div className="space-y-2">
        <Label className="ml-1" htmlFor="publicMetadata">
          Public Metadata (Optional, JSON)
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="publicMetadata"
          onChange={(value) => onUpdateConfig("publicMetadata", value)}
          placeholder='{"role": "admin"}'
          rows={3}
          value={(config?.publicMetadata as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          JSON object to merge with existing public metadata.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="ml-1" htmlFor="privateMetadata">
          Private Metadata (Optional, JSON)
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="privateMetadata"
          onChange={(value) => onUpdateConfig("privateMetadata", value)}
          placeholder='{"stripeId": "cus_..."}'
          rows={3}
          value={(config?.privateMetadata as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          JSON object to merge with existing private metadata.
        </p>
      </div>
    </>
  );
}
