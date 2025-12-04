"use client";

import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

export type ObjectProperty = {
  id: string;
  key: string;
  value: string;
};

type ValidateFn = (
  value: string,
  property: ObjectProperty
) => string | undefined;

type PropertyRowProps = {
  prop: ObjectProperty;
  index: number;
  disabled?: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
  keyLabel: string;
  valueLabel: string;
  supportsTemplates: boolean;
  keyError?: string;
  valueError?: string;
  onUpdate: (updates: Partial<ObjectProperty>) => void;
  onRemove: () => void;
};

function PropertyRow({
  prop,
  index,
  disabled,
  keyPlaceholder,
  valuePlaceholder,
  keyLabel,
  valueLabel,
  supportsTemplates,
  keyError,
  valueError,
  onUpdate,
  onRemove,
}: PropertyRowProps) {
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          {index === 0 && (
            <Label className="ml-1 text-muted-foreground text-xs">
              {keyLabel}
            </Label>
          )}
          <Input
            className={
              keyError ? "border-red-500 focus-visible:ring-red-500" : ""
            }
            disabled={disabled}
            onChange={(e) => onUpdate({ key: e.target.value })}
            placeholder={keyPlaceholder}
            value={prop.key}
          />
        </div>
        <div className="flex-1 space-y-1">
          {index === 0 && (
            <Label className="ml-1 text-muted-foreground text-xs">
              {valueLabel}
            </Label>
          )}
          {supportsTemplates ? (
            <TemplateBadgeInput
              className={
                valueError ? "border-red-500 focus-within:ring-red-500" : ""
              }
              disabled={disabled}
              onChange={(value) => onUpdate({ value })}
              placeholder={valuePlaceholder}
              value={prop.value}
            />
          ) : (
            <Input
              className={
                valueError ? "border-red-500 focus-visible:ring-red-500" : ""
              }
              disabled={disabled}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder={valuePlaceholder}
              value={prop.value}
            />
          )}
        </div>
        <div className={`flex items-end ${index === 0 ? "pb-0" : ""}`}>
          {index === 0 && <div className="h-5" />}
          <Button
            disabled={disabled}
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {(keyError || valueError) && (
        <p className="mt-1 text-red-500 text-xs">{keyError || valueError}</p>
      )}
    </div>
  );
}

type ObjectBuilderProps = {
  properties: ObjectProperty[];
  onChange: (properties: ObjectProperty[]) => void;
  disabled?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyLabel?: string;
  valueLabel?: string;
  supportsTemplates?: boolean;
  validateKey?: ValidateFn;
  validateValue?: ValidateFn;
};

export function ObjectBuilder({
  properties,
  onChange,
  disabled,
  keyPlaceholder = "key",
  valuePlaceholder = "value",
  keyLabel = "Key",
  valueLabel = "Value",
  supportsTemplates = true,
  validateKey,
  validateValue,
}: ObjectBuilderProps) {
  const addProperty = () => {
    onChange([...properties, { id: nanoid(), key: "", value: "" }]);
  };

  const updateProperty = (index: number, updates: Partial<ObjectProperty>) => {
    const newProperties = [...properties];
    newProperties[index] = { ...newProperties[index], ...updates };
    onChange(newProperties);
  };

  const removeProperty = (index: number) => {
    onChange(properties.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {properties.map((prop, index) => (
        <PropertyRow
          disabled={disabled}
          index={index}
          key={prop.id}
          keyError={validateKey?.(prop.key, prop)}
          keyLabel={keyLabel}
          keyPlaceholder={keyPlaceholder}
          onRemove={() => removeProperty(index)}
          onUpdate={(updates) => updateProperty(index, updates)}
          prop={prop}
          supportsTemplates={supportsTemplates}
          valueError={validateValue?.(prop.value, prop)}
          valueLabel={valueLabel}
          valuePlaceholder={valuePlaceholder}
        />
      ))}

      <Button
        className="w-full"
        disabled={disabled}
        onClick={addProperty}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
        Add Property
      </Button>
    </div>
  );
}

export function propertiesToObject(
  properties: ObjectProperty[]
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const prop of properties) {
    if (prop.key.trim()) {
      obj[prop.key] = prop.value;
    }
  }
  return obj;
}

export function objectToProperties(
  obj: Record<string, string> | undefined | null
): ObjectProperty[] {
  if (!obj || typeof obj !== "object") {
    return [];
  }
  return Object.entries(obj).map(([key, value]) => ({
    id: nanoid(),
    key,
    value: String(value),
  }));
}
