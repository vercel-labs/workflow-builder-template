import "server-only";

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: {
    type: string;
    repo: string;
    repoId: number;
    org?: string;
    gitCredentialId?: string;
    productionBranch?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state:
    | "BUILDING"
    | "ERROR"
    | "INITIALIZING"
    | "QUEUED"
    | "READY"
    | "CANCELED";
  type: "LAMBDAS";
  created: number;
  creator: {
    uid: string;
    email?: string;
    username?: string;
  };
  target: "production" | "staging" | null;
}

export interface ListProjectsParams {
  apiToken: string;
  teamId?: string;
}

export interface ListProjectsResult {
  status: "success" | "error";
  projects?: VercelProject[];
  error?: string;
}

export interface GetProjectParams {
  projectId: string;
  apiToken: string;
  teamId?: string;
}

export interface GetProjectResult {
  status: "success" | "error";
  project?: VercelProject;
  error?: string;
}

export interface ListDeploymentsParams {
  projectId: string;
  apiToken: string;
  teamId?: string;
  limit?: number;
}

export interface ListDeploymentsResult {
  status: "success" | "error";
  deployments?: VercelDeployment[];
  error?: string;
}

export interface TriggerDeploymentParams {
  projectId: string;
  apiToken: string;
  teamId?: string;
  target?: "production" | "staging";
}

export interface TriggerDeploymentResult {
  status: "success" | "error";
  deployment?: VercelDeployment;
  error?: string;
}

export interface CreateProjectParams {
  name: string;
  apiToken: string;
  teamId?: string;
  framework?: string;
  gitRepository?: {
    type: "github" | "gitlab" | "bitbucket";
    repo: string;
  };
}

export interface CreateProjectResult {
  status: "success" | "error";
  project?: VercelProject;
  error?: string;
}

/**
 * Base Vercel API URL
 */
const VERCEL_API_BASE = "https://api.vercel.com";

/**
 * Helper function to make Vercel API requests
 */
async function vercelRequest<T>(
  path: string,
  apiToken: string,
  options: RequestInit = {},
  teamId?: string
): Promise<T> {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  if (teamId) {
    url.searchParams.append("teamId", teamId);
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Vercel API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * List all projects in a Vercel account or team
 */
export async function listProjects(
  params: ListProjectsParams
): Promise<ListProjectsResult> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const data = await vercelRequest<{ projects: VercelProject[] }>(
      "/v9/projects",
      params.apiToken,
      {},
      params.teamId
    );

    return {
      status: "success",
      projects: data.projects,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a specific project by ID
 */
export async function getProject(
  params: GetProjectParams
): Promise<GetProjectResult> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const project = await vercelRequest<VercelProject>(
      `/v9/projects/${params.projectId}`,
      params.apiToken,
      {},
      params.teamId
    );

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List deployments for a project
 */
export async function listDeployments(
  params: ListDeploymentsParams
): Promise<ListDeploymentsResult> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const url = `/v6/deployments?projectId=${params.projectId}${params.limit ? `&limit=${params.limit}` : ""}`;
    const data = await vercelRequest<{ deployments: VercelDeployment[] }>(
      url,
      params.apiToken,
      {},
      params.teamId
    );

    return {
      status: "success",
      deployments: data.deployments,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Trigger a new deployment (redeploy) for a project
 * Note: This requires the project to have a connected Git repository
 */
export async function triggerDeployment(
  params: TriggerDeploymentParams
): Promise<TriggerDeploymentResult> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    // First, get the latest deployment to redeploy
    const deploymentsResult = await listDeployments({
      projectId: params.projectId,
      apiToken: params.apiToken,
      teamId: params.teamId,
      limit: 1,
    });

    if (
      deploymentsResult.status === "error" ||
      !deploymentsResult.deployments?.length
    ) {
      return {
        status: "error",
        error: deploymentsResult.error || "No deployments found to redeploy",
      };
    }

    const latestDeployment = deploymentsResult.deployments[0];

    // Trigger a redeploy
    const deployment = await vercelRequest<VercelDeployment>(
      "/v13/deployments",
      params.apiToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: latestDeployment.name,
          deploymentId: latestDeployment.uid,
          target: params.target || "production",
        }),
      },
      params.teamId
    );

    return {
      status: "success",
      deployment,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new Vercel project
 */
export async function createProject(
  params: CreateProjectParams
): Promise<CreateProjectResult> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const projectData: {
      name: string;
      framework?: string;
      gitRepository?: {
        type: "github" | "gitlab" | "bitbucket";
        repo: string;
      };
    } = {
      name: params.name,
    };

    if (params.framework) {
      projectData.framework = params.framework;
    }

    if (params.gitRepository) {
      projectData.gitRepository = params.gitRepository;
    }

    const project = await vercelRequest<VercelProject>(
      "/v9/projects",
      params.apiToken,
      {
        method: "POST",
        body: JSON.stringify(projectData),
      },
      params.teamId
    );

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get environment variables for a project
 */
export async function getEnvironmentVariables(
  params: GetProjectParams
): Promise<{
  status: "success" | "error";
  envs?: Array<{
    id: string;
    key: string;
    value: string;
    type: "plain" | "secret" | "encrypted" | "system";
    target: Array<"production" | "preview" | "development">;
  }>;
  error?: string;
}> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const data = await vercelRequest<{
      envs: Array<{
        id: string;
        key: string;
        value: string;
        type: "plain" | "secret" | "encrypted" | "system";
        target: Array<"production" | "preview" | "development">;
      }>;
    }>(
      `/v9/projects/${params.projectId}/env`,
      params.apiToken,
      {},
      params.teamId
    );

    return {
      status: "success",
      envs: data.envs,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
