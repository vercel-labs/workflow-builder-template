"use client";

import { Database, Search, Settings } from "lucide-react";
import { useMemo, useState } from "react";
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
  return <Settings className="size-8" />;
}

export function ActionGrid({ onSelectAction, disabled }: ActionGridProps) {
  const [filter, setFilter] = useState("");
  const actions = useAllActions();

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
            disabled={disabled}
            id="action-filter"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search actions..."
            value={filter}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filteredActions.map((action) => (
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent",
              disabled && "pointer-events-none opacity-50"
            )}
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
