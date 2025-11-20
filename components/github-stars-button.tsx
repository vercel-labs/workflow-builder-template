"use client";

import { GitHubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { formatAbbreviatedNumber } from "@/lib/utils/format-number";

const GITHUB_REPO_URL =
  "https://github.com/vercel-labs/workflow-builder-template";

type GitHubStarsButtonProps = {
  initialStars?: number | null;
};

export function GitHubStarsButton({ initialStars }: GitHubStarsButtonProps) {
  if (!initialStars) {
    return null;
  }

  return (
    <Button
      asChild
      className="h-8 gap-1.5 px-2 sm:px-3"
      size="sm"
      variant="ghost"
    >
      <a
        className="flex items-center"
        href={GITHUB_REPO_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <GitHubIcon className="size-3.5" />
        <span className="text-sm">{formatAbbreviatedNumber(initialStars)}</span>
      </a>
    </Button>
  );
}
