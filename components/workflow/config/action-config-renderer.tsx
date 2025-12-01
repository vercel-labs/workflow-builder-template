"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/code-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import {
  fetchIntegrationsAtom,
  integrationsAtom,
  integrationsFetchedAtom,
  integrationsLoadingAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import {
  getHttpEnabledPlugins,
  getIntegration,
  getPluginHttpConfig,
} from "@/plugins";
import type { ActionConfigField } from "@/plugins/registry";
import {
  ObjectBuilder,
  type ObjectProperty,
  objectToProperties,
} from "./object-builder";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type FieldProps = {
  field: ActionConfigField;
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  config?: Record<string, unknown>;
};

function TemplateInputField({
  field,
  value,
  onChange,
  disabled,
  config,
}: FieldProps) {
  const allIntegrations = useAtomValue(integrationsAtom);

  const prefix = useMemo(() => {
    if (field.key !== "endpoint" || !config?.integrationId) {
      return;
    }

    const integrationId = config.integrationId as string;
    const integration = allIntegrations.find((i) => i.id === integrationId);
    if (!integration) {
      return;
    }

    const httpConfig = getPluginHttpConfig(integration.type as IntegrationType);
    return httpConfig?.baseUrl;
  }, [field.key, config?.integrationId, allIntegrations]);

  const displayPlaceholder = prefix ? "/path" : field.placeholder;

  return (
    <TemplateBadgeInput
      disabled={disabled}
      id={field.key}
      onChange={onChange}
      placeholder={displayPlaceholder}
      prefix={prefix}
      value={value}
    />
  );
}

function TemplateTextareaField({
  field,
  value,
  onChange,
  disabled,
}: FieldProps) {
  return (
    <TemplateBadgeTextarea
      disabled={disabled}
      id={field.key}
      onChange={onChange}
      placeholder={field.placeholder}
      rows={field.rows || 4}
      value={value}
    />
  );
}

function TextInputField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <Input
      disabled={disabled}
      id={field.key}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      value={value}
    />
  );
}

function NumberInputField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <Input
      disabled={disabled}
      id={field.key}
      min={field.min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      type="number"
      value={value}
    />
  );
}

function SelectField({ field, value, onChange, disabled }: FieldProps) {
  if (!field.options) {
    return null;
  }

  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full" id={field.key}>
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {field.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SchemaBuilderField(props: FieldProps) {
  return (
    <SchemaBuilder
      disabled={props.disabled}
      onChange={(schema) => props.onChange(JSON.stringify(schema))}
      schema={props.value ? (JSON.parse(props.value) as SchemaField[]) : []}
    />
  );
}

function ObjectBuilderField(props: FieldProps) {
  let properties: ObjectProperty[] = [];
  if (props.value) {
    try {
      const parsed = JSON.parse(props.value);
      if (Array.isArray(parsed)) {
        properties = parsed;
      } else if (typeof parsed === "object") {
        properties = objectToProperties(parsed);
      }
    } catch {
      // If parsing fails, start with empty array
    }
  }

  const validateKey = props.field.validateKey
    ? (key: string, prop: ObjectProperty) =>
        props.field.validateKey?.(key, prop.value)
    : undefined;
  const validateValue = props.field.validateValue
    ? (value: string, prop: ObjectProperty) =>
        props.field.validateValue?.(value, prop.key)
    : undefined;

  return (
    <ObjectBuilder
      disabled={props.disabled}
      keyPlaceholder={props.field.placeholder}
      onChange={(newProperties) => {
        props.onChange(JSON.stringify(newProperties));
      }}
      properties={properties}
      validateKey={validateKey}
      validateValue={validateValue}
    />
  );
}

function JsonEditorField({ value, onChange, disabled }: FieldProps) {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      const val = newValue || "";
      onChange(val);

      if (val.trim()) {
        try {
          JSON.parse(val);
          setJsonError(null);
        } catch (e) {
          setJsonError(e instanceof Error ? e.message : "Invalid JSON");
        }
      } else {
        setJsonError(null);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-1">
      <div className="overflow-hidden rounded-md border border-input">
        <CodeEditor
          height="150px"
          language="json"
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            folding: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            readOnly: disabled,
            fontSize: 13,
            tabSize: 2,
            padding: { top: 8, bottom: 8 },
          }}
          value={value || ""}
        />
      </div>
      {jsonError && <p className="text-red-500 text-xs">{jsonError}</p>}
    </div>
  );
}

function IntegrationSelectField({
  field,
  value,
  onChange,
  disabled,
}: FieldProps) {
  const allIntegrations = useAtomValue(integrationsAtom);
  const loading = useAtomValue(integrationsLoadingAtom);
  const fetched = useAtomValue(integrationsFetchedAtom);
  const fetchIntegrations = useSetAtom(fetchIntegrationsAtom);

  const httpEnabledTypes = useMemo(() => {
    const plugins = getHttpEnabledPlugins();
    return new Set(plugins.map((p) => p.type));
  }, []);

  const httpIntegrations = useMemo(
    () => allIntegrations.filter((i) => httpEnabledTypes.has(i.type)),
    [allIntegrations, httpEnabledTypes]
  );

  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, typeof httpIntegrations> = {};
    for (const integration of httpIntegrations) {
      if (!groups[integration.type]) {
        groups[integration.type] = [];
      }
      groups[integration.type].push(integration);
    }
    return groups;
  }, [httpIntegrations]);

  useEffect(() => {
    if (!(fetched || loading)) {
      fetchIntegrations();
    }
  }, [fetched, loading, fetchIntegrations]);

  if (loading || !fetched) {
    return (
      <Select disabled value="">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Loading integrations..." />
        </SelectTrigger>
      </Select>
    );
  }

  const getPluginLabel = (type: string): string => {
    const plugin = getIntegration(type as Parameters<typeof getIntegration>[0]);
    return plugin?.label || type;
  };

  return (
    <Select
      disabled={disabled}
      onValueChange={(val) => onChange(val === "__none__" ? "" : val)}
      value={value || "__none__"}
    >
      <SelectTrigger className="w-full" id={field.key}>
        <SelectValue
          placeholder={field.placeholder || "Select integration..."}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None - manual authentication</SelectItem>
        {httpIntegrations.length > 0 && <Separator className="my-1" />}
        {Object.entries(groupedIntegrations).map(([type, integrations]) => (
          <div key={type}>
            <div className="px-2 py-1 font-medium text-muted-foreground text-xs">
              {getPluginLabel(type)}
            </div>
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={integration.id}>
                {integration.name}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

const FIELD_RENDERERS: Record<
  ActionConfigField["type"],
  React.ComponentType<FieldProps>
> = {
  "template-input": TemplateInputField,
  "template-textarea": TemplateTextareaField,
  text: TextInputField,
  number: NumberInputField,
  select: SelectField,
  "schema-builder": SchemaBuilderField,
  "object-builder": ObjectBuilderField,
  "integration-select": IntegrationSelectField,
  "json-editor": JsonEditorField,
};

type ActionConfigRendererProps = {
  fields: ActionConfigField[];
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
};

export function ActionConfigRenderer({
  fields,
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigRendererProps) {
  return (
    <>
      {fields.map((field) => {
        if (field.showWhen) {
          const dependentValue = config[field.showWhen.field];
          if (dependentValue !== field.showWhen.equals) {
            return null;
          }
        }

        const value =
          (config[field.key] as string | undefined) || field.defaultValue || "";
        const FieldRenderer = FIELD_RENDERERS[field.type];

        return (
          <div className="space-y-2" key={field.key}>
            <Label className="ml-1" htmlFor={field.key}>
              {field.label}
            </Label>
            <FieldRenderer
              config={config}
              disabled={disabled}
              field={field}
              onChange={(val) => onUpdateConfig(field.key, val)}
              value={value}
            />
          </div>
        );
      })}
    </>
  );
}
