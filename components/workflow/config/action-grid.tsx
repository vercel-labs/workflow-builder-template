"use client";

import {
  Database,
  Eraser,
  Flame,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ActionType = {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  integration?:
    | "linear"
    | "resend"
    | "slack"
    | "vercel"
    | "firecrawl"
    | "superagent";
};

const actions: ActionType[] = [
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
  {
    id: "Send Email",
    label: "Send Email",
    description: "Send an email via Resend",
    category: "Resend",
    icon: Mail,
    integration: "resend",
  },
  {
    id: "Send Slack Message",
    label: "Send Slack Message",
    description: "Post a message to Slack",
    category: "Slack",
    icon: MessageSquare,
    integration: "slack",
  },
  {
    id: "Create Ticket",
    label: "Create Ticket",
    description: "Create a Linear ticket",
    category: "Linear",
    icon: Ticket,
    integration: "linear",
  },
  {
    id: "Find Issues",
    label: "Find Issues",
    description: "Search Linear issues",
    category: "Linear",
    icon: Ticket,
    integration: "linear",
  },
  {
    id: "Generate Text",
    label: "Generate Text",
    description: "Generate text with AI",
    category: "AI Gateway",
    icon: Sparkles,
    integration: "vercel",
  },
  {
    id: "Generate Image",
    label: "Generate Image",
    description: "Generate images with AI",
    category: "AI Gateway",
    icon: Sparkles,
    integration: "vercel",
  },
  {
    id: "Scrape",
    label: "Scrape URL",
    description: "Scrape content from a URL",
    category: "Firecrawl",
    icon: Flame,
    integration: "firecrawl",
  },
  {
    id: "Search",
    label: "Search Web",
    description: "Search the web with Firecrawl",
    category: "Firecrawl",
    icon: Search,
    integration: "firecrawl",
  },
  {
    id: "Guard",
    label: "Guard",
    description: "Analyze text for security threats",
    category: "Superagent",
    icon: Shield,
    integration: "superagent",
  },
  {
    id: "Redact",
    label: "Redact",
    description: "Remove sensitive data from text",
    category: "Superagent",
    icon: Eraser,
    integration: "superagent",
  },
];

type ActionGridProps = {
  onSelectAction: (actionType: string) => void;
  disabled?: boolean;
};

export function ActionGrid({ onSelectAction, disabled }: ActionGridProps) {
  const [filter, setFilter] = useState("");

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
            {action.integration ? (
              <IntegrationIcon
                className="size-8"
                integration={action.integration}
              />
            ) : (
              <action.icon className="size-8" />
            )}
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
