"use client";

import { Button } from "@/components/ui/button";
import { VERCEL_DEPLOY_URL } from "@/lib/constants";

export function DeployButton() {
  return (
    <Button
      asChild
      className="h-9 gap-1.5 border px-2 sm:px-3"
      size="sm"
      variant="secondary"
    >
      <a href={VERCEL_DEPLOY_URL} rel="noopener noreferrer" target="_blank">
        <svg
          aria-label="Vercel logomark"
          className="size-3.5"
          fill="currentColor"
          viewBox="0 0 76 76"
        >
          <title>Vercel logomark</title>
          <path d="m38 0 38 66H0z" />
        </svg>
        <span className="text-sm sm:hidden">Deploy</span>
        <span className="hidden text-sm sm:inline">Deploy Your Own</span>
      </a>
    </Button>
  );
}
