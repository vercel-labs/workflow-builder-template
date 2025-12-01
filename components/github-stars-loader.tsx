import type { ReactNode } from "react";
import { GitHubStarsProvider } from "@/components/github-stars-provider";

const GITHUB_REPO = "vercel-labs/workflow-builder-template";

async function getGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.stargazers_count;
  } catch {
    return null;
  }
}

export async function GitHubStarsLoader({ children }: { children: ReactNode }) {
  const stars = await getGitHubStars();
  return <GitHubStarsProvider stars={stars}>{children}</GitHubStarsProvider>;
}
