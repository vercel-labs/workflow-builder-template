import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Create User Config Fields Component
 * UI for configuring the create user action
 */
export function CreateUserConfigFields({
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
        <Label className="ml-1" htmlFor="emailAddress">
          Email Address
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailAddress"
          onChange={(value) => onUpdateConfig("emailAddress", value)}
          placeholder="user@example.com or {{NodeName.email}}"
          value={(config?.emailAddress as string) || ""}
        />
      </div>

      <div className="space-y-2">
        <Label className="ml-1" htmlFor="password">
          Password (Optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="password"
          onChange={(value) => onUpdateConfig("password", value)}
          placeholder="Min 8 chars, or leave empty"
          value={(config?.password as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          Must be at least 8 characters. Leave empty to let user set their own.
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
          placeholder='{"role": "user"}'
          rows={3}
          value={(config?.publicMetadata as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          JSON object visible to the frontend.
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
          placeholder='{"internalId": "abc123"}'
          rows={3}
          value={(config?.privateMetadata as string) || ""}
        />
        <p className="text-muted-foreground text-sm">
          JSON object only accessible server-side.
        </p>
      </div>
    </>
  );
}
