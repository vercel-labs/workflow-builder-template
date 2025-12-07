"use client";

import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
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
import {
  type ActionConfigField,
  type ActionConfigFieldBase,
  isFieldGroup,
} from "@/plugins";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type FieldProps = {
  field: ActionConfigFieldBase;
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

function TemplateInputField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <TemplateBadgeInput
      disabled={disabled}
      id={field.key}
      onChange={onChange}
      placeholder={field.placeholder}
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

type AbiFunctionSelectProps = FieldProps & {
  abiValue: string;
  functionFilter?: "read" | "write";
};

function AbiFunctionSelectField({
  field,
  value,
  onChange,
  disabled,
  abiValue,
  functionFilter = "read",
}: AbiFunctionSelectProps) {
  // Parse ABI and extract functions
  const functions = React.useMemo(() => {
    if (!abiValue || abiValue.trim() === "") {
      return [];
    }

    try {
      const abi = JSON.parse(abiValue);
      if (!Array.isArray(abi)) {
        return [];
      }

      // Filter functions based on functionFilter prop
      const filterFn =
        functionFilter === "write"
          ? (item: { type: string; stateMutability?: string }) =>
              item.type === "function" &&
              item.stateMutability !== "view" &&
              item.stateMutability !== "pure"
          : (item: { type: string; stateMutability?: string }) =>
              item.type === "function" &&
              (item.stateMutability === "view" ||
                item.stateMutability === "pure");

      return abi.filter(filterFn).map((func) => {
        const inputs = func.inputs || [];
        const params = inputs
          .map(
            (input: { name: string; type: string }) =>
              `${input.type} ${input.name}`
          )
          .join(", ");
        return {
          name: func.name,
          label: `${func.name}(${params})`,
          stateMutability: func.stateMutability || "nonpayable",
        };
      });
    } catch {
      return [];
    }
  }, [abiValue, functionFilter]);

  if (functions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-sm">
        {abiValue
          ? "No functions found in ABI"
          : "Enter ABI above to see available functions"}
      </div>
    );
  }

  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full" id={field.key}>
        <SelectValue placeholder={field.placeholder || "Select a function"} />
      </SelectTrigger>
      <SelectContent>
        {functions.map((func) => (
          <SelectItem key={func.name} value={func.name}>
            <div className="flex flex-col items-start">
              <span>{func.label}</span>
              <span className="text-muted-foreground text-xs">
                {func.stateMutability}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type AbiFunctionArgsProps = FieldProps & {
  abiValue: string;
  functionValue: string;
};

function AbiFunctionArgsField({
  field,
  value,
  onChange,
  disabled,
  abiValue,
  functionValue,
}: AbiFunctionArgsProps) {
  // Parse the function inputs from the ABI
  const functionInputs = React.useMemo(() => {
    if (
      !(abiValue && functionValue) ||
      abiValue.trim() === "" ||
      functionValue.trim() === ""
    ) {
      return [];
    }

    try {
      const abi = JSON.parse(abiValue);
      if (!Array.isArray(abi)) {
        return [];
      }

      const func = abi.find(
        (item) => item.type === "function" && item.name === functionValue
      );

      if (!func?.inputs) {
        return [];
      }

      return func.inputs.map((input: { name: string; type: string }) => ({
        name: input.name || "unnamed",
        type: input.type,
      }));
    } catch {
      return [];
    }
  }, [abiValue, functionValue]);

  // Parse current value (JSON array) into individual arg values
  const argValues = React.useMemo(() => {
    if (!value || value.trim() === "") {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [value]);

  // Handle individual arg change
  const handleArgChange = (index: number, newValue: string) => {
    const newArgs = [...argValues];
    // Ensure array is long enough
    while (newArgs.length <= index) {
      newArgs.push("");
    }
    newArgs[index] = newValue;
    onChange(JSON.stringify(newArgs));
  };

  if (functionInputs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-sm">
        {functionValue
          ? "This function has no parameters"
          : "Select a function above to see parameters"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {functionInputs.map(
        (input: { name: string; type: string }, index: number) => (
          <div className="space-y-1.5" key={`${field.key}-arg-${index}`}>
            <Label className="ml-1 text-xs" htmlFor={`${field.key}-${index}`}>
              {input.name}{" "}
              <span className="text-muted-foreground">({input.type})</span>
            </Label>
            <TemplateBadgeInput
              disabled={disabled}
              id={`${field.key}-${index}`}
              onChange={(val) => handleArgChange(index, val as string)}
              placeholder={`Enter ${input.type} value or {{NodeName.value}}`}
              value={(argValues[index] as string) || ""}
            />
          </div>
        )
      )}
    </div>
  );
}

const FIELD_RENDERERS: Partial<
  Record<ActionConfigFieldBase["type"], React.ComponentType<FieldProps>>
> = {
  "template-input": TemplateInputField,
  "template-textarea": TemplateTextareaField,
  text: TextInputField,
  number: NumberInputField,
  select: SelectField,
  "schema-builder": SchemaBuilderField,
};

/**
 * Renders a single base field
 */
function renderField(
  field: ActionConfigFieldBase,
  config: Record<string, unknown>,
  onUpdateConfig: (key: string, value: unknown) => void,
  disabled?: boolean
) {
  // Check conditional rendering
  if (field.showWhen) {
    const dependentValue = config[field.showWhen.field];
    if (dependentValue !== field.showWhen.equals) {
      return null;
    }
  }

  const value =
    (config[field.key] as string | undefined) || field.defaultValue || "";

  // Special handling for abi-function-select
  if (field.type === "abi-function-select") {
    const abiField = field.abiField || "abi";
    const abiValue = (config[abiField] as string | undefined) || "";

    return (
      <div className="space-y-2" key={field.key}>
        <Label className="ml-1" htmlFor={field.key}>
          {field.label}
        </Label>
        <AbiFunctionSelectField
          abiValue={abiValue}
          disabled={disabled}
          field={field}
          functionFilter={field.functionFilter}
          onChange={(val) => onUpdateConfig(field.key, val)}
          value={value}
        />
      </div>
    );
  }

  // Special handling for abi-function-args
  if (field.type === "abi-function-args") {
    const abiField = field.abiField || "abi";
    const functionField = field.abiFunctionField || "abiFunction";
    const abiValue = (config[abiField] as string | undefined) || "";
    const functionValue = (config[functionField] as string | undefined) || "";

    return (
      <div className="space-y-2" key={field.key}>
        <Label className="ml-1" htmlFor={field.key}>
          {field.label}
        </Label>
        <AbiFunctionArgsField
          abiValue={abiValue}
          disabled={disabled}
          field={field}
          functionValue={functionValue}
          onChange={(val) => onUpdateConfig(field.key, val)}
          value={value}
        />
      </div>
    );
  }

  const FieldRenderer = FIELD_RENDERERS[field.type];

  if (!FieldRenderer) {
    return null;
  }

  return (
    <div className="space-y-2" key={field.key}>
      <Label className="ml-1" htmlFor={field.key}>
        {field.label}
      </Label>
      <FieldRenderer
        disabled={disabled}
        field={field}
        onChange={(val: unknown) => onUpdateConfig(field.key, val)}
        value={value}
      />
    </div>
  );
}

/**
 * Collapsible field group component
 */
function FieldGroup({
  label,
  fields,
  config,
  onUpdateConfig,
  disabled,
  defaultExpanded = false,
}: {
  label: string;
  fields: ActionConfigFieldBase[];
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-2">
      <button
        className="ml-1 flex items-center gap-1 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="font-medium text-sm">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
      </button>
      {isExpanded && (
        <div className="ml-1 space-y-4 border-primary/50 border-l-2 py-2 pl-3">
          {fields.map((field) =>
            renderField(field, config, onUpdateConfig, disabled)
          )}
        </div>
      )}
    </div>
  );
}

type ActionConfigRendererProps = {
  fields: ActionConfigField[];
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
};

/**
 * Renders action config fields declaratively
 * Converts ActionConfigField definitions into actual UI components
 */
export function ActionConfigRenderer({
  fields,
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigRendererProps) {
  return (
    <>
      {fields.map((field) => {
        if (isFieldGroup(field)) {
          return (
            <FieldGroup
              config={config}
              defaultExpanded={field.defaultExpanded}
              disabled={disabled}
              fields={field.fields}
              key={`group-${field.label}`}
              label={field.label}
              onUpdateConfig={onUpdateConfig}
            />
          );
        }

        return renderField(field, config, onUpdateConfig, disabled);
      })}
    </>
  );
}
