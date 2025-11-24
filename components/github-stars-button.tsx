"use client";

import { useEffect, useState } from "react";
import { GitHubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { formatAbbreviatedNumber } from "@/lib/utils/format-number";

const GITHUB_REPO_URL =
  "https://github.com/vercel-labs/workflow-builder-template";

export function GitHubStarsButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/vercel-labs/workflow-builder-template")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(() => setStars(null));
  }, []);

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
        <GitHubIcon className="size-4.5" />
        {stars !== null && (
          <span className="hidden text-sm sm:inline">
            {formatAbbreviatedNumber(stars)} stars
          </span>
        )}
      </a>
    </Button>
  );
}
