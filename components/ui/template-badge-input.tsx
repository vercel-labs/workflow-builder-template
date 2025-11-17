"use client";

import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { nodesAtom, selectedNodeAtom } from "@/lib/workflow-store";
import { TemplateAutocomplete } from "./template-autocomplete";

export interface TemplateBadgeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Helper to get display text from template by looking up current node label
function getDisplayTextForTemplate(template: string, nodes: ReturnType<typeof useAtom<typeof nodesAtom>>[0]): string {
  // Extract nodeId and field from template: {{@nodeId:OldLabel.field}}
  const match = template.match(/\{\{@([^:]+):([^}]+)\}\}/);
  if (!match) return template;
  
  const nodeId = match[1];
  const rest = match[2]; // e.g., "OldLabel.field" or "OldLabel"
  
  // Find the current node
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    // Node not found, return as-is
    return rest;
  }
  
  // Replace old label with current label
  const currentLabel = node.data.label || "";
  const dotIndex = rest.indexOf(".");
  
  if (dotIndex === -1) {
    // No field, just the node: {{@nodeId:Label}}
    return currentLabel || rest;
  }
  
  // Has field: {{@nodeId:Label.field}}
  const field = rest.substring(dotIndex + 1);
  
  // If currentLabel is empty, fall back to the original label from the template
  if (!currentLabel) {
    return rest;
  }
  
  return `${currentLabel}.${field}`;
}

/**
 * An input component that renders template variables as styled badges
 * Converts {{@nodeId:DisplayName.field}} to badges showing "DisplayName.field"
 */
export function TemplateBadgeInput({
  value = "",
  onChange,
  placeholder,
  disabled,
  className,
  id,
}: TemplateBadgeInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(value);
  const shouldUpdateDisplay = useRef(true);
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [atSignPosition, setAtSignPosition] = useState<number | null>(null);

  // Update internal value when prop changes from outside
  useEffect(() => {
    if (value !== internalValue && !isFocused) {
      setInternalValue(value);
      shouldUpdateDisplay.current = true;
    }
  }, [value, isFocused, internalValue]);

  // Update display when nodes change (to reflect label updates)
  useEffect(() => {
    if (!isFocused && internalValue) {
      shouldUpdateDisplay.current = true;
    }
  }, [nodes, isFocused, internalValue]);

  // Save cursor position
  const saveCursorPosition = (): { offset: number } | null => {
    if (!contentRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log("[Input] saveCursorPosition: No selection");
      return null;
    }
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    console.log("[Input] saveCursorPosition: range.endContainer", range.endContainer, "endOffset", range.endOffset);
    
    // Calculate offset considering badges as single characters
    let offset = 0;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    let found = false;
    while ((node = walker.nextNode()) && !found) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node === range.endContainer) {
          offset += range.endOffset;
          found = true;
          console.log("[Input] saveCursorPosition: Found cursor in text node, offset:", offset);
        } else {
          const textLength = (node.textContent || "").length;
          offset += textLength;
          console.log("[Input] saveCursorPosition: Text node before cursor, length:", textLength);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          if (element.contains(range.endContainer) || element === range.endContainer) {
            offset += template.length;
            found = true;
            console.log("[Input] saveCursorPosition: Found cursor in badge, offset:", offset);
          } else {
            offset += template.length;
            console.log("[Input] saveCursorPosition: Badge before cursor, length:", template.length);
          }
        }
      }
    }
    
    console.log("[Input] saveCursorPosition: Final offset:", offset);
    return { offset };
  };
  
  // Restore cursor position
  const restoreCursorPosition = (cursorPos: { offset: number } | null) => {
    if (!contentRef.current || !cursorPos) {
      console.log("[Input] restoreCursorPosition: No cursorPos or contentRef");
      return;
    }
    
    console.log("[Input] restoreCursorPosition: Restoring to offset:", cursorPos.offset);
    
    let offset = 0;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    let targetNode: Node | null = null;
    let targetOffset = 0;
    
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = (node.textContent || "").length;
        console.log("[Input] restoreCursorPosition: Text node, length:", textLength, "current offset:", offset);
        if (offset + textLength >= cursorPos.offset) {
          targetNode = node;
          targetOffset = cursorPos.offset - offset;
          console.log("[Input] restoreCursorPosition: Found target text node, targetOffset:", targetOffset);
          break;
        }
        offset += textLength;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          console.log("[Input] restoreCursorPosition: Badge, length:", template.length, "current offset:", offset);
          if (offset + template.length >= cursorPos.offset) {
            // Position cursor after the badge
            targetNode = element.nextSibling;
            targetOffset = 0;
            console.log("[Input] restoreCursorPosition: Target after badge, nextSibling:", targetNode);
            if (!targetNode && element.parentNode) {
              // If no next sibling, create a text node
              targetNode = document.createTextNode("");
              element.parentNode.appendChild(targetNode);
              console.log("[Input] restoreCursorPosition: Created text node after badge");
            }
            break;
          }
          offset += template.length;
        }
      }
    }
    
    if (targetNode) {
      const range = document.createRange();
      const selection = window.getSelection();
      try {
        const finalOffset = Math.min(targetOffset, targetNode.textContent?.length || 0);
        console.log("[Input] restoreCursorPosition: Setting cursor at node, offset:", finalOffset);
        range.setStart(targetNode, finalOffset);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        console.log("[Input] restoreCursorPosition: Cursor restored successfully");
      } catch (e) {
        console.log("[Input] restoreCursorPosition: Error setting range:", e);
        // If positioning fails, just focus the element
        contentRef.current.focus();
      }
    } else {
      console.log("[Input] restoreCursorPosition: No target node found");
    }
  };

  // Parse text and render with badges
  const updateDisplay = () => {
    if (!contentRef.current || !shouldUpdateDisplay.current) return;

    const container = contentRef.current;
    const text = internalValue || "";
    
    console.log("[Input] updateDisplay: isFocused:", isFocused, "text:", text);
    
    // Save cursor position before updating
    const cursorPos = isFocused ? saveCursorPosition() : null;

    // Clear current content
    console.log("[Input] updateDisplay: Clearing innerHTML");
    container.innerHTML = "";

    if (!text && !isFocused) {
      // Show placeholder
      container.innerHTML = `<span class="text-muted-foreground pointer-events-none">${placeholder || ""}</span>`;
      return;
    }

    // Match template patterns: {{@nodeId:DisplayName.field}} or {{@nodeId:DisplayName}}
    const pattern = /\{\{@([^:]+):([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let badgeCount = 0;

    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, , displayPart] = match;
      const matchStart = match.index;
      badgeCount++;

      console.log("[Input] updateDisplay: Found badge", badgeCount, "at", matchStart, "template:", fullMatch);

      // Add text before the template
      if (matchStart > lastIndex) {
        const textBefore = text.slice(lastIndex, matchStart);
        const textNode = document.createTextNode(textBefore);
        container.appendChild(textNode);
        console.log("[Input] updateDisplay: Added text before badge:", textBefore);
      }

      // Create badge for template
      const badge = document.createElement("span");
      badge.className =
        "inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-600 dark:text-blue-400 font-mono text-xs border border-blue-500/20 mx-0.5";
      badge.contentEditable = "false";
      badge.setAttribute("data-template", fullMatch);
      // Use current node label for display
      badge.textContent = getDisplayTextForTemplate(fullMatch, nodes);
      container.appendChild(badge);
      console.log("[Input] updateDisplay: Added badge with display:", badge.textContent);

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex);
      const textNode = document.createTextNode(textAfter);
      container.appendChild(textNode);
      console.log("[Input] updateDisplay: Added text after badges:", textAfter);
    }

    // If empty and focused, ensure we can type
    if (container.innerHTML === "" && isFocused) {
      container.innerHTML = "<br>";
      console.log("[Input] updateDisplay: Added <br> for empty focused field");
    }

    shouldUpdateDisplay.current = false;
    
    console.log("[Input] updateDisplay: Final DOM:", container.innerHTML);
    
    // Restore cursor position after updating
    if (cursorPos) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => restoreCursorPosition(cursorPos));
    }
  };

  // Extract plain text from content
  const extractValue = (): string => {
    if (!contentRef.current) return "";

    let result = "";
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Check if this text node is inside a badge element
        let parent = node.parentElement;
        let isInsideBadge = false;
        while (parent && parent !== contentRef.current) {
          if (parent.getAttribute("data-template")) {
            isInsideBadge = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        // Only add text if it's NOT inside a badge
        if (!isInsideBadge) {
          result += node.textContent;
          console.log("[Input] extractValue: Adding text node:", node.textContent);
        } else {
          console.log("[Input] extractValue: Skipping text inside badge:", node.textContent);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          result += template;
          console.log("[Input] extractValue: Adding template:", template);
        }
      }
    }

    console.log("[Input] extractValue: Final result:", result);
    return result;
  };

  const handleInput = () => {
    // Extract the value from DOM
    const newValue = extractValue();
    
    console.log("[Input] handleInput: newValue:", newValue);
    console.log("[Input] handleInput: internalValue:", internalValue);
    console.log("[Input] handleInput: DOM innerHTML:", contentRef.current?.innerHTML);
    
    // Check if the value has changed
    if (newValue === internalValue) {
      // No change, ignore (this can happen with badge clicks, etc)
      console.log("[Input] handleInput: No change detected, ignoring");
      return;
    }
    
    // Count templates in old and new values
    const oldTemplates = (internalValue.match(/\{\{@([^:]+):([^}]+)\}\}/g) || []).length;
    const newTemplates = (newValue.match(/\{\{@([^:]+):([^}]+)\}\}/g) || []).length;
    
    console.log("[Input] handleInput: oldTemplates:", oldTemplates, "newTemplates:", newTemplates);
    
    if (newTemplates > oldTemplates) {
      // A new template was added, update display to show badge
      console.log("[Input] handleInput: New template added, rendering badge");
      setInternalValue(newValue);
      onChange?.(newValue);
      shouldUpdateDisplay.current = true;
      setShowAutocomplete(false);
      
      // Call updateDisplay immediately to render badges
      requestAnimationFrame(() => updateDisplay());
      return;
    }
    
    if (newTemplates === oldTemplates && newTemplates > 0) {
      // Same number of templates, just typing around existing badges
      // DON'T update display, just update the value
      console.log("[Input] handleInput: Typing around existing badges, NOT updating display");
      setInternalValue(newValue);
      onChange?.(newValue);
      // Don't trigger display update - this prevents cursor reset!
      
      // Check for @ sign to show autocomplete (moved here so it works with existing badges)
      const lastAtSign = newValue.lastIndexOf("@");
      
      if (lastAtSign !== -1) {
        const filter = newValue.slice(lastAtSign + 1);
        
        if (!filter.includes(" ")) {
          setAutocompleteFilter(filter);
          setAtSignPosition(lastAtSign);
          
          if (contentRef.current) {
            const inputRect = contentRef.current.getBoundingClientRect();
            const position = {
              top: inputRect.bottom + window.scrollY + 4,
              left: inputRect.left + window.scrollX,
            };
            setAutocompletePosition(position);
          }
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
      
      return;
    }
    
    if (newTemplates < oldTemplates) {
      // A template was removed (e.g., user deleted a badge or part of template text)
      console.log("[Input] handleInput: Template removed, updating display");
      setInternalValue(newValue);
      onChange?.(newValue);
      shouldUpdateDisplay.current = true;
      requestAnimationFrame(() => updateDisplay());
      return;
    }
    
    // Normal typing (no badges present)
    console.log("[Input] handleInput: Normal typing, no badges");
    setInternalValue(newValue);
    onChange?.(newValue);
    
    // Check for @ sign to show autocomplete
    const lastAtSign = newValue.lastIndexOf("@");
    
    if (lastAtSign !== -1) {
      const filter = newValue.slice(lastAtSign + 1);
      
      if (!filter.includes(" ")) {
        setAutocompleteFilter(filter);
        setAtSignPosition(lastAtSign);
        
        if (contentRef.current) {
          const inputRect = contentRef.current.getBoundingClientRect();
          const position = {
            top: inputRect.bottom + window.scrollY + 4,
            left: inputRect.left + window.scrollX,
          };
          setAutocompletePosition(position);
        }
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleAutocompleteSelect = (template: string) => {
    if (!contentRef.current || atSignPosition === null) return;
    
    // Get current text
    const currentText = extractValue();
    
    // Replace from @ position to end of filter with the template
    const beforeAt = currentText.slice(0, atSignPosition);
    const afterFilter = currentText.slice(atSignPosition + 1 + autocompleteFilter.length);
    const newText = beforeAt + template + afterFilter;
    
    // Calculate where cursor should be after the template (right after the badge)
    const targetCursorPosition = beforeAt.length + template.length;
    
    console.log("[Input] Autocomplete select:", {
      currentText,
      atSignPosition,
      filter: autocompleteFilter,
      template,
      beforeAt,
      afterFilter,
      newText,
      targetCursorPosition
    });
    
    setInternalValue(newText);
    onChange?.(newText);
    shouldUpdateDisplay.current = true;
    
    setShowAutocomplete(false);
    setAtSignPosition(null);
    
    // Force immediate display update and restore cursor to correct position
    requestAnimationFrame(() => {
      updateDisplay();
      
      // After display updates, position cursor after the newly inserted badge
      requestAnimationFrame(() => {
        if (!contentRef.current) return;
        
        // Find the position to place cursor
        let offset = 0;
        const walker = document.createTreeWalker(
          contentRef.current,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          null
        );
        
        let node;
        let targetNode: Node | null = null;
        
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            let isInsideBadge = false;
            while (parent && parent !== contentRef.current) {
              if (parent.getAttribute("data-template")) {
                isInsideBadge = true;
                break;
              }
            }
            
            if (!isInsideBadge) {
              const textLength = (node.textContent || "").length;
              if (offset + textLength >= targetCursorPosition) {
                // Found the target text node
                targetNode = node;
                const nodeOffset = targetCursorPosition - offset;
                const range = document.createRange();
                const selection = window.getSelection();
                range.setStart(node, nodeOffset);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
                console.log("[Input] Cursor positioned at offset", nodeOffset, "in text node");
                break;
              }
              offset += textLength;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const template = element.getAttribute("data-template");
            if (template) {
              if (offset + template.length >= targetCursorPosition) {
                // Cursor should be right after this badge
                targetNode = element.nextSibling;
                if (!targetNode) {
                  // Create a text node after the badge
                  targetNode = document.createTextNode("");
                  element.parentNode?.appendChild(targetNode);
                }
                const range = document.createRange();
                const selection = window.getSelection();
                range.setStart(targetNode, 0);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
                console.log("[Input] Cursor positioned after badge");
                break;
              }
              offset += template.length;
            }
          }
        }
        
        contentRef.current.focus();
      });
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    shouldUpdateDisplay.current = true;
  };

  const handleBlur = () => {
    // Delay to allow autocomplete click to register
    setTimeout(() => {
      setIsFocused(false);
      // Don't extract value on blur - it's already in sync from handleInput
      // Just trigger a display update to ensure everything renders correctly
      shouldUpdateDisplay.current = true;
      setShowAutocomplete(false);
    }, 200);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  // Update display only when needed (not while typing)
  useEffect(() => {
    if (shouldUpdateDisplay.current) {
      updateDisplay();
    }
  }, [internalValue, isFocused]);

  return (
    <>
      <div
        className={cn(
          "flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div
          className="w-full outline-none"
          contentEditable={!disabled}
          id={id}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onInput={handleInput}
          onPaste={handlePaste}
          ref={contentRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
      
      <TemplateAutocomplete
        currentNodeId={selectedNodeId || undefined}
        filter={autocompleteFilter}
        isOpen={showAutocomplete}
        onClose={() => setShowAutocomplete(false)}
        onSelect={handleAutocompleteSelect}
        position={autocompletePosition}
      />
    </>
  );
}

