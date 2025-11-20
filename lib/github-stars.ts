const GITHUB_REPO = "vercel-labs/workflow-builder-template";
const CACHE_DURATION = 5 * 60; // 5 minutes in seconds

export async function getGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "workflow-builder-template",
        },
        next: { revalidate: CACHE_DURATION },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.stargazers_count || null;
  } catch (error) {
    console.error("Error fetching GitHub stars:", error);
    return null;
  }
}
