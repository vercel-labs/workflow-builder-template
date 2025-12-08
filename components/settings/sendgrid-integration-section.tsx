"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationConfig } from "@/lib/types/integration";
import type { IntegrationPlugin } from "@/plugins/registry";

type SendGridIntegrationSectionProps = {
  formFields: IntegrationPlugin["formFields"];
  config: IntegrationConfig;
  updateConfig: (key: string, value: string | boolean) => void;
};

const renderHelpText = (
  helpText?: string,
  helpLink?: { text: string; url: string }
) => {
  if (!(helpText || helpLink)) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-xs">
      {helpText}
      {helpLink && (
        <a
          className="underline hover:text-foreground"
          href={helpLink.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {helpLink.text}
        </a>
      )}
    </p>
  );
};

const renderCheckboxField = (
  field: {
    id: string;
    type: string;
    label: string;
    configKey: string;
    defaultValue?: string | boolean;
    helpText?: string;
    helpLink?: { text: string; url: string };
  },
  config: IntegrationConfig,
  updateConfig: (key: string, value: string | boolean) => void
) => {
  let checkboxValue: string | boolean | undefined = config[field.configKey];
  if (checkboxValue === undefined) {
    checkboxValue =
      field.defaultValue !== undefined ? field.defaultValue : true;
  }
  const isChecked =
    typeof checkboxValue === "boolean"
      ? checkboxValue
      : checkboxValue === "true";

  return (
    <div className="flex items-center space-x-2" key={field.id}>
      <Checkbox
        checked={isChecked}
        id={field.id}
        onCheckedChange={(checked) =>
          updateConfig(field.configKey, checked === true)
        }
      />
      <Label className="cursor-pointer font-normal" htmlFor={field.id}>
        {field.label}
      </Label>
      {renderHelpText(field.helpText, field.helpLink)}
    </div>
  );
};

const renderInputField = (
  field: {
    id: string;
    type: string;
    label: string;
    configKey: string;
    placeholder?: string;
    helpText?: string;
    helpLink?: { text: string; url: string };
  },
  config: IntegrationConfig,
  updateConfig: (key: string, value: string | boolean) => void
) => (
  <div className="space-y-2" key={field.id}>
    <Label htmlFor={field.id}>{field.label}</Label>
    <Input
      id={field.id}
      onChange={(e) => updateConfig(field.configKey, e.target.value)}
      placeholder={field.placeholder}
      type={field.type}
      value={(config[field.configKey] as string) || ""}
    />
    {renderHelpText(field.helpText, field.helpLink)}
  </div>
);

export function SendGridIntegrationSection({
  formFields,
  config,
  updateConfig,
}: SendGridIntegrationSectionProps) {
  // Check if useKeeperHubApiKey checkbox is checked
  const useKeeperHubApiKey =
    config.useKeeperHubApiKey !== undefined
      ? config.useKeeperHubApiKey === true ||
        config.useKeeperHubApiKey === "true"
      : true; // Default to true

  return (
    <>
      {formFields.map((field) => {
        if (field.type === "checkbox") {
          return renderCheckboxField(field, config, updateConfig);
        }

        // Hide API key field if useKeeperHubApiKey is checked
        if (useKeeperHubApiKey && field.configKey === "apiKey") {
          return null;
        }

        return renderInputField(field, config, updateConfig);
      })}
    </>
  );
}
