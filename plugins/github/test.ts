const GITHUB_API_URL = "https://api.github.com";

type GitHubUser = {
  login: string;
  id: number;
  name?: string;
};

export async function testGitHub(credentials: Record<string, string>) {
  try {
    const token = credentials.GITHUB_TOKEN;

    if (!token) {
      return {
        success: false,
        error: "GITHUB_TOKEN is required",
      };
    }

    const response = await fetch(`${GITHUB_API_URL}/user`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid token. Please check your GitHub personal access token.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    const user = (await response.json()) as GitHubUser;

    if (!user.login) {
      return {
        success: false,
        error: "Failed to verify GitHub connection",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

