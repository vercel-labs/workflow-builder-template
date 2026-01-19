import { nanoid } from "nanoid";
import type { SchemaField } from "@/components/workflow/config/schema-builder";

type ValidFieldType = SchemaField["type"];
type ValidItemType = NonNullable<SchemaField["itemType"]>;

type ArrayStructure = {
  type: "array";
  itemType: ValidFieldType | FieldsStructure;
};

type FieldsStructure = {
  [key: string]: ValidFieldType | FieldsStructure | ArrayStructure;
};

const detectType = (value: unknown): ValidFieldType => {
  if (value === null) {
    return "string";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  const t = typeof value;
  if (t === "object") {
    return "object";
  }
  if (t === "string") {
    return "string";
  }
  if (t === "number") {
    return "number";
  }
  if (t === "boolean") {
    return "boolean";
  }
  return "string";
};

const processArray = (arr: unknown[]): ArrayStructure => {
  if (arr.length === 0) {
    return { type: "array", itemType: "string" };
  }

  const firstElement = arr[0];

  if (Array.isArray(firstElement)) {
    return { type: "array", itemType: "object" };
  }

  if (
    typeof firstElement === "object" &&
    firstElement !== null &&
    !Array.isArray(firstElement)
  ) {
    return { type: "array", itemType: extractFields(firstElement) };
  }

  const detectedType = detectType(firstElement);
  if (detectedType === "array") {
    return { type: "array", itemType: "object" };
  }
  return { type: "array", itemType: detectedType };
};

const extractFields = (obj: unknown): FieldsStructure => {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return {};
  }

  const result: FieldsStructure = {};

  for (const key in obj as Record<string, unknown>) {
    if (Object.hasOwn(obj, key)) {
      const value = (obj as Record<string, unknown>)[key];
      const valueType = detectType(value);

      if (valueType === "object") {
        result[key] = extractFields(value);
      } else if (valueType === "array") {
        result[key] = processArray(value as unknown[]);
      } else {
        result[key] = valueType;
      }
    }
  }
  return result;
};

const createPrimitiveField = (
  key: string,
  type: ValidFieldType
): SchemaField => ({
  id: nanoid(),
  name: key,
  type,
});

const createArrayField = (
  key: string,
  arrayStructure: ArrayStructure
): SchemaField => {
  const field: SchemaField = {
    id: nanoid(),
    name: key,
    type: "array",
  };

  if (typeof arrayStructure.itemType === "string") {
    if (arrayStructure.itemType === "array") {
      field.itemType = "object";
      field.fields = [];
    } else {
      field.itemType = arrayStructure.itemType as ValidItemType;
    }
  } else if (typeof arrayStructure.itemType === "object") {
    field.itemType = "object";
    field.fields = convertToSchemaFields(arrayStructure.itemType);
  }

  return field;
};

const createObjectField = (
  key: string,
  fieldsStructure: FieldsStructure
): SchemaField => ({
  id: nanoid(),
  name: key,
  type: "object",
  fields: convertToSchemaFields(fieldsStructure),
});

const convertToSchemaFields = (
  fieldsStructure: FieldsStructure
): SchemaField[] => {
  const result: SchemaField[] = [];

  for (const [key, value] of Object.entries(fieldsStructure)) {
    if (typeof value === "string") {
      result.push(createPrimitiveField(key, value));
    } else if (typeof value === "object" && value !== null) {
      if ("type" in value && value.type === "array") {
        result.push(createArrayField(key, value as ArrayStructure));
      } else {
        result.push(createObjectField(key, value as FieldsStructure));
      }
    }
  }

  return result;
};

export const inferSchemaFromJSON = (jsonString: string): SchemaField[] => {
  const parsed = JSON.parse(jsonString);
  const fieldsStructure = extractFields(parsed);
  return convertToSchemaFields(fieldsStructure);
};
