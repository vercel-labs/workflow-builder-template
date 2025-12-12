"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TemplateBadgeTextarea } from "./template-badge-textarea";

export interface TemplateBadgeJsonProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  rows?: number;
}

/**
 * A textarea component that validates JSON input in real-time
 * Wraps TemplateBadgeTextarea and adds JSON validation and formatting
 */
export function TemplateBadgeJson({
  value = "",
  onChange,
  placeholder,
  disabled,
  className,
  id,
  rows = 3,
}: TemplateBadgeJsonProps) {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const formatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFormattedValueRef = useRef<string>("");

  // Validate JSON on value change
  useEffect(() => {
    if (!value || typeof value !== "string") {
      setJsonError(null);
      return;
    }

    // If empty or only whitespace, no error
    if (!value.trim()) {
      setJsonError(null);
      return;
    }

    // Ensure that parsable values (not object) throws
    if (!/^\s*\{[\s\S]*\}\s*$/.test(value)) {
      setJsonError("Value must be a JSON object");
      return;
    }

    // Parse JSON directly - template variables will be treated as normal strings
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (error) {
      setJsonError(
        error instanceof Error ? error.message : "Invalid JSON format"
      );
    }
  }, [value]);

  // Format JSON when it becomes valid (debounced to avoid formatting while typing)
  useEffect(() => {
    // Clear any pending format timeout
    if (formatTimeoutRef.current) {
      clearTimeout(formatTimeoutRef.current);
    }

    // Don't format if there's an error, field is focused, or value is empty
    if (jsonError || isFocused || !value || typeof value !== "string") {
      return;
    }

    if (!value.trim()) {
      return;
    }

    // Debounce formatting - wait 500ms after user stops typing
    formatTimeoutRef.current = setTimeout(() => {
      try {
        // Parse JSON directly - template variables are treated as normal strings
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);

        // Only format if different from current value and we haven't already formatted this value
        if (formatted !== value && formatted !== lastFormattedValueRef.current) {
          lastFormattedValueRef.current = formatted;
          onChange?.(formatted);
        }
      } catch {
        // If parsing fails, don't format
      }
    }, 500);

    return () => {
      if (formatTimeoutRef.current) {
        clearTimeout(formatTimeoutRef.current);
      }
    };
  }, [value, isFocused, jsonError, onChange]);

  // Track focus state by listening to focus/blur events on the wrapper
  const handleWrapperFocus = () => {
    setIsFocused(true);
  };

  const handleWrapperBlur = () => {
    setIsFocused(false);
    // Format immediately on blur if JSON is valid
    if (!jsonError && value && typeof value === "string" && value.trim()) {
      try {
        // Parse JSON directly - template variables are treated as normal strings
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);

        if (formatted !== value) {
          onChange?.(formatted);
        }
      } catch {
        // If parsing fails, don't format
      }
    }
  };

  return (
    <div
      className="space-y-1"
      onBlur={handleWrapperBlur}
      onFocus={handleWrapperFocus}
    >
      <TemplateBadgeTextarea
        className={cn(
          jsonError && "border-destructive focus-within:ring-destructive",
          className
        )}
        disabled={disabled}
        id={id}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      {jsonError && (
        <p className="ml-1 text-destructive text-xs">{jsonError}</p>
      )}
    </div>
  );
}
