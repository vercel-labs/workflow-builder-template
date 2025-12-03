"use client";

import { Database, Search, Settings, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getAllActions } from "@/plugins";

type ActionType = {
  id: string;
  label: string;
  description: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  integration?: string;
};

// System actions that don't have plugins
const SYSTEM_ACTIONS: ActionType[] = [
  {
    id: "HTTP Request",
    label: "HTTP Request",
    description: "Make an HTTP request to any API",
    category: "System",
    icon: Zap,
  },
  {
    id: "Database Query",
    label: "Database Query",
    description: "Query your database",
    category: "System",
    icon: Database,
  },
  {
    id: "Condition",
    label: "Condition",
    description: "Branch based on a condition",
    category: "System",
    icon: Settings,
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

function ActionIcon({ action }: { action: ActionType }) {
  if (action.integration) {
    return (
      <IntegrationIcon className="size-8" integration={action.integration} />
    );
  }
  if (action.icon) {
    return <action.icon className="size-8" />;
  }
  return <Zap className="size-8" />;
}

export function ActionGrid({
  onSelectAction,
  disabled,
  isNewlyCreated,
}: ActionGridProps) {
  const [filter, setFilter] = useState("");
  const actions = useAllActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewlyCreated && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewlyCreated]);

  const filteredActions = actions.filter((action) => {
    const searchTerm = filter.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm) ||
      action.category.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="action-filter">
          Search Actions
        </Label>
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            data-testid="action-search-input"
            disabled={disabled}
            id="action-filter"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search actions..."
            ref={inputRef}
            value={filter}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" data-testid="action-grid">
        {filteredActions.map((action) => (
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent",
              disabled && "pointer-events-none opacity-50"
            )}
            data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
            disabled={disabled}
            key={action.id}
            onClick={() => onSelectAction(action.id)}
            type="button"
          >
            <ActionIcon action={action} />
            <p className="text-center font-medium text-sm">{action.label}</p>
          </button>
        ))}
      </div>

      {filteredActions.length === 0 && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No actions found
        </p>
      )}
    </div>
  );
}
