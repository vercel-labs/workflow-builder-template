"use client";

import { Database, HelpCircle } from "lucide-react";
import Image from "next/image";
import type { IntegrationType } from "@/lib/db/integrations";
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

// Special icons for integrations without plugins (database, vercel, ai-gateway)
const SPECIAL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  database: Database,
  vercel: VercelIcon,
  "ai-gateway": VercelIcon,
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

  if (plugin) {
    const { icon } = plugin;

    // Handle image type icons
    if (icon.type === "image") {
      return (
        <Image
          alt={`${plugin.label} logo`}
          className={className}
          height={12}
          src={icon.value}
          width={12}
        />
      );
    }

    // Handle SVG component icons
    if (icon.type === "svg" && icon.svgComponent) {
      const SvgComponent = icon.svgComponent;
      return <SvgComponent className={cn("text-foreground", className)} />;
    }

    // Handle lucide icons - these are already React components in plugin.actions
    // For plugin-level icons, we would need to dynamically import lucide icons
    // For now, fall through to default
  }

  // Fallback for unknown integrations
  return <HelpCircle className={cn("text-foreground", className)} />;
}
