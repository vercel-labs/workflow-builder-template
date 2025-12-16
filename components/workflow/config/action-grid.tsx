"use client";

import {
  ChevronRight,
  Eye,
  EyeOff,
  Grid3X3,
  List,
  MoreHorizontal,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsTouch } from "@/hooks/use-touch";
import { cn } from "@/lib/utils";
import { getAllActions } from "@/plugins";

type ActionType = {
  id: string;
  label: string;
  description: string;
  category: string;
  integration?: string;
};

// System actions that don't have plugins
const SYSTEM_ACTIONS: ActionType[] = [
  {
    id: "HTTP Request",
    label: "HTTP Request",
    description: "Make an HTTP request to any API",
    category: "System",
  },
  {
    id: "Database Query",
    label: "Database Query",
    description: "Query your database",
    category: "System",
  },
  {
    id: "Condition",
    label: "Condition",
    description: "Branch based on a condition",
    category: "System",
  },
];

// Combine System actions with plugin actions
function useAllActions(): ActionType[] {
  return useMemo(() => {
    const pluginActions = getAllActions();

    // Map plugin actions to ActionType format
    const mappedPluginActions: ActionType[] = pluginActions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      category: action.category,
      integration: action.integration,
    }));

    return [...SYSTEM_ACTIONS, ...mappedPluginActions];
  }, []);
}

type ActionGridProps = {
  onSelectAction: (actionType: string) => void;
  disabled?: boolean;
  isNewlyCreated?: boolean;
};

function GroupIcon({
  group,
}: {
  group: { category: string; actions: ActionType[] };
}) {
  // For plugin categories, use the integration icon from the first action
  const firstAction = group.actions[0];
  if (firstAction?.integration) {
    return (
      <IntegrationIcon
        className="size-4"
        integration={firstAction.integration}
      />
    );
  }
  // For System category
  if (group.category === "System") {
    return <Settings className="size-4" />;
  }
  return <Zap className="size-4" />;
}

function ActionIcon({
  action,
  className,
}: {
  action: ActionType;
  className?: string;
}) {
  if (action.integration) {
    return (
      <IntegrationIcon className={className} integration={action.integration} />
    );
  }
  if (action.category === "System") {
    return <Settings className={cn(className, "text-muted-foreground")} />;
  }
  return <Zap className={cn(className, "text-muted-foreground")} />;
}

// Local storage keys
const HIDDEN_GROUPS_KEY = "workflow-action-grid-hidden-groups";
const VIEW_MODE_KEY = "workflow-action-grid-view-mode";

type ViewMode = "list" | "grid";

function getInitialHiddenGroups(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(HIDDEN_GROUPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function ActionGrid({
  onSelectAction,
  disabled,
  isNewlyCreated,
}: ActionGridProps) {
  const [filter, setFilter] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(
    getInitialHiddenGroups
  );
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const actions = useAllActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const isTouch = useIsTouch();

  const toggleViewMode = () => {
    const newMode = viewMode === "list" ? "grid" : "list";
    setViewMode(newMode);
    localStorage.setItem(VIEW_MODE_KEY, newMode);
  };

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleHideGroup = (category: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      // Persist to localStorage
      localStorage.setItem(HIDDEN_GROUPS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    // Only focus after touch detection is complete (isTouch !== undefined)
    // and only on non-touch devices to avoid opening the keyboard
    if (isNewlyCreated && isTouch === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewlyCreated, isTouch]);

  const filteredActions = actions.filter((action) => {
    const searchTerm = filter.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm) ||
      action.category.toLowerCase().includes(searchTerm)
    );
  });

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, ActionType[]> = {};

    for (const action of filteredActions) {
      const category = action.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
    }

    // Sort categories: System first, then alphabetically
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      if (a === "System") return -1;
      if (b === "System") return 1;
      return a.localeCompare(b);
    });

    return sortedCategories.map((category) => ({
      category,
      actions: groups[category],
    }));
  }, [filteredActions]);

  // Filter groups based on hidden state
  const visibleGroups = useMemo(() => {
    if (showHidden) return groupedActions;
    return groupedActions.filter((g) => !hiddenGroups.has(g.category));
  }, [groupedActions, hiddenGroups, showHidden]);

  const hiddenCount = hiddenGroups.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            data-testid="action-search-input"
            disabled={disabled}
            id="action-filter"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search actions..."
            ref={inputRef}
            value={filter}
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="shrink-0"
                onClick={toggleViewMode}
                size="icon"
                variant="ghost"
              >
                {viewMode === "list" ? (
                  <Grid3X3 className="size-4" />
                ) : (
                  <List className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewMode === "list" ? "Grid view" : "List view"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn("shrink-0", showHidden && "bg-muted")}
                  onClick={() => setShowHidden(!showHidden)}
                  size="icon"
                  variant="ghost"
                >
                  {showHidden ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showHidden
                  ? "Hide hidden groups"
                  : `Show ${hiddenCount} hidden group${hiddenCount > 1 ? "s" : ""}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-4"
        data-testid="action-grid"
      >
        {filteredActions.length === 0 && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No actions found
          </p>
        )}
        {filteredActions.length > 0 && visibleGroups.length === 0 && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            All groups are hidden
          </p>
        )}

        {/* Grid View */}
        {viewMode === "grid" && visibleGroups.length > 0 && (
          <div
            className="grid gap-2 p-1"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            }}
          >
            {filteredActions
              .filter(
                (action) => showHidden || !hiddenGroups.has(action.category)
              )
              .map((action) => (
                <button
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-transparent p-2 text-center transition-colors hover:border-border hover:bg-muted",
                    disabled && "pointer-events-none opacity-50"
                  )}
                  data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
                  disabled={disabled}
                  key={action.id}
                  onClick={() => onSelectAction(action.id)}
                  type="button"
                >
                  <ActionIcon action={action} className="size-6" />
                  <span className="line-clamp-2 font-medium text-xs leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" &&
          visibleGroups.length > 0 &&
          visibleGroups.map((group, groupIndex) => {
            const isCollapsed = collapsedGroups.has(group.category);
            const isHidden = hiddenGroups.has(group.category);
            return (
              <div key={group.category}>
                {groupIndex > 0 && <div className="my-2 h-px bg-border" />}
                <div
                  className={cn(
                    "sticky top-0 z-10 mb-1 flex items-center gap-2 bg-background px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider",
                    isHidden && "opacity-50"
                  )}
                >
                  <button
                    className="flex flex-1 items-center gap-2 text-left hover:text-foreground"
                    onClick={() => toggleGroup(group.category)}
                    type="button"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                    <GroupIcon group={group} />
                    {group.category}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded p-0.5 hover:bg-muted hover:text-foreground"
                        type="button"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleHideGroup(group.category)}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="mr-2 size-4" />
                            Show group
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-2 size-4" />
                            Hide group
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {!isCollapsed &&
                  group.actions.map((action) => (
                    <button
                      className={cn(
                        "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        disabled && "pointer-events-none opacity-50"
                      )}
                      data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
                      disabled={disabled}
                      key={action.id}
                      onClick={() => onSelectAction(action.id)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{action.label}</span>
                        {action.description && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            - {action.description}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}
