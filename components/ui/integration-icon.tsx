"use client";

import { Database, HelpCircle } from "lucide-react";
import type { IntegrationType } from "@/lib/types/integration";
import { cn } from "@/lib/utils";
import { getIntegration } from "@/plugins";

interface IntegrationIconProps {
  integration: string;
  className?: string;
}

// Inline SVG for Vercel icon (special case - no plugin)
function VercelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      height="12"
      viewBox="0 0 1155 1000"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m577.3 0 577.4 1000H0z" />
    </svg>
  );
}

// Special icons for integrations without plugins (database, vercel)
const SPECIAL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  database: Database,
  vercel: VercelIcon,
};

export function IntegrationIcon({
  integration,
  className = "h-3 w-3",
}: IntegrationIconProps) {
  // Check for special icons first (integrations without plugins)
  const SpecialIcon = SPECIAL_ICONS[integration];
  if (SpecialIcon) {
    return <SpecialIcon className={cn("text-foreground", className)} />;
  }

  // Look up plugin from registry
  const plugin = getIntegration(integration as IntegrationType);

  if (plugin?.icon) {
    const PluginIcon = plugin.icon;
    return <PluginIcon className={cn("text-foreground", className)} />;
  }

  // Fallback for unknown integrations
  return <HelpCircle className={cn("text-foreground", className)} />;
}
