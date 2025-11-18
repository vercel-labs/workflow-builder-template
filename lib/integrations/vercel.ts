import "server-only";
import { Vercel } from "@vercel/sdk";

export type VercelProject = {
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
};

export type VercelDeployment = {
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
};

export type ListProjectsParams = {
  apiToken: string;
  teamId?: string;
};

export type ListProjectsResult = {
  status: "success" | "error";
  projects?: VercelProject[];
  error?: string;
};

export type GetProjectParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
};

export type GetProjectResult = {
  status: "success" | "error";
  project?: VercelProject;
  error?: string;
};

export type ListDeploymentsParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
  limit?: number;
};

export type ListDeploymentsResult = {
  status: "success" | "error";
  deployments?: VercelDeployment[];
  error?: string;
};

export type TriggerDeploymentParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
  target?: "production" | "staging";
};

export type TriggerDeploymentResult = {
  status: "success" | "error";
  deployment?: VercelDeployment;
  error?: string;
};

export type CreateProjectParams = {
  name: string;
  apiToken: string;
  teamId?: string;
  framework?: string;
  gitRepository?: {
    type: "github" | "gitlab" | "bitbucket";
    repo: string;
  };
};

export type CreateProjectResult = {
  status: "success" | "error";
  project?: VercelProject;
  error?: string;
};

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
 * Get a single decrypted environment variable by ID
 */
export async function getDecryptedEnvironmentVariable(
  params: GetProjectParams & { envId: string }
): Promise<{
  status: "success" | "error";
  env?: {
    id: string;
    key: string;
    value: string;
    type: "plain" | "secret" | "encrypted" | "system";
    target: Array<"production" | "preview" | "development">;
  };
  error?: string;
}> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const vercel = new Vercel({
      bearerToken: params.apiToken,
    });

    console.log("[DEBUG Vercel SDK] Fetching decrypted env var:", params.envId);

    // Use SDK to get the decrypted value
    const response = await vercel.projects.getProjectEnv({
      idOrName: params.projectId,
      id: params.envId,
      teamId: params.teamId,
    });

    const env = response as any;

    console.log("[DEBUG Vercel SDK] Decrypted env var:", {
      key: env.key,
      type: env.type,
      valueLength: env.value?.length,
      valuePreview: env.value?.substring(0, 20) + "...",
    });

    return {
      status: "success",
      env: {
        id: env.id || "",
        key: env.key || "",
        value: env.value || "",
        type: (env.type as "plain" | "secret" | "encrypted" | "system") || "plain",
        target: (env.target as Array<"production" | "preview" | "development">) || [],
      },
    };
  } catch (error) {
    console.error("[DEBUG Vercel SDK] Error fetching decrypted env var:", error);
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
  params: GetProjectParams & { decrypt?: boolean }
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

    const vercel = new Vercel({
      bearerToken: params.apiToken,
    });

    console.log("[DEBUG Vercel SDK] Fetching env vars for project:", params.projectId, "teamId:", params.teamId);

    // Use SDK to get environment variables
    const response = await vercel.projects.filterProjectEnvs({
      idOrName: params.projectId,
      teamId: params.teamId,
      decrypt: params.decrypt ? "true" : undefined,
    });

    // Response can have envs as an array or object property
    const envList = (response as any).envs || [];

    console.log("[DEBUG Vercel SDK] Found", envList.length, "environment variables");
    console.log("[DEBUG Vercel SDK] Env var keys:", envList.map((e: any) => e.key).join(", "));

    if (!envList || envList.length === 0) {
      return {
        status: "success",
        envs: [],
      };
    }

    // For encrypted variables, fetch the decrypted value using the individual endpoint
    const envsWithDecryption = await Promise.all(
      envList.map(async (env: any) => {
        if (params.decrypt && env.type === "encrypted" && env.id) {
          console.log("[DEBUG Vercel SDK] Fetching decrypted value for:", env.key);
          const decryptedResult = await getDecryptedEnvironmentVariable({
            projectId: params.projectId,
            apiToken: params.apiToken,
            teamId: params.teamId,
            envId: env.id,
          });

          if (decryptedResult.status === "success" && decryptedResult.env?.value) {
            console.log("[DEBUG Vercel SDK] Successfully decrypted:", env.key, "value length:", decryptedResult.env.value.length);
            return {
              ...env,
              value: decryptedResult.env.value,
            };
          }
        }
        return env;
      })
    );

    console.log(
      "[DEBUG Vercel SDK] Sample env var:",
      envsWithDecryption.find((e: any) => e.key === "AI_GATEWAY_API_KEY")
        ? {
            key: envsWithDecryption.find((e: any) => e.key === "AI_GATEWAY_API_KEY")?.key,
            value:
              envsWithDecryption
                .find((e: any) => e.key === "AI_GATEWAY_API_KEY")
                ?.value?.substring(0, 15) + "...",
            type: envsWithDecryption.find((e: any) => e.key === "AI_GATEWAY_API_KEY")
              ?.type,
          }
        : "not found"
    );

    return {
      status: "success",
      envs: envsWithDecryption.map((env: any) => ({
        id: env.id || "",
        key: env.key || "",
        value: env.value || "",
        type:
          (env.type as "plain" | "secret" | "encrypted" | "system") || "plain",
        target:
          (env.target as Array<"production" | "preview" | "development">) || [],
      })),
    };
  } catch (error) {
    console.error("[DEBUG Vercel SDK] Error fetching env vars:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type CreateEnvironmentVariableParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
  key: string;
  value: string;
  target?: Array<"production" | "preview" | "development">;
  type?: "plain" | "secret" | "encrypted";
};

/**
 * Create or update an environment variable for a project
 */
export async function setEnvironmentVariable(
  params: CreateEnvironmentVariableParams
): Promise<{
  status: "success" | "error";
  env?: {
    id: string;
    key: string;
    value: string;
    type: "plain" | "secret" | "encrypted" | "system";
    target: Array<"production" | "preview" | "development">;
  };
  error?: string;
}> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    const vercel = new Vercel({
      bearerToken: params.apiToken,
    });

    // Check if the environment variable already exists
    const existingEnvs = await vercel.projects.filterProjectEnvs({
      idOrName: params.projectId,
      teamId: params.teamId,
    });

    const envList = (existingEnvs as any).envs || [];
    if (envList) {
      const existingEnv = envList.find((e: any) => e.key === params.key);

      // If it exists, delete it first
      if (existingEnv?.id) {
        await vercel.projects.removeProjectEnv({
          idOrName: params.projectId,
          id: existingEnv.id,
          teamId: params.teamId,
        });
      }
    }

    // Create the new environment variable using upsert
    const response = await vercel.projects.createProjectEnv({
      idOrName: params.projectId,
      teamId: params.teamId,
      upsert: "true",
      requestBody: {
        key: params.key,
        value: params.value,
        target: params.target || ["production", "preview", "development"],
        type: params.type || "encrypted", // Use "encrypted" type for maximum security
      },
    });

    if (!response.created) {
      return {
        status: "error",
        error: "Failed to create environment variable",
      };
    }

    // Handle response which can be an array or object
    const createdEnv = Array.isArray(response.created)
      ? response.created[0]
      : response.created;

    return {
      status: "success",
      env: {
        id: (createdEnv as any)?.id || "",
        key: (createdEnv as any)?.key || "",
        value: (createdEnv as any)?.value || "",
        type:
          ((createdEnv as any)?.type as
            | "plain"
            | "secret"
            | "encrypted"
            | "system") || "secret",
        target:
          ((createdEnv as any)?.target as Array<
            "production" | "preview" | "development"
          >) || [],
      },
    };
  } catch (error) {
    console.error("[DEBUG Vercel SDK] Error setting env var:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type DeleteEnvironmentVariableParams = {
  projectId: string;
  apiToken: string;
  teamId?: string;
  envId: string;
};

/**
 * Delete an environment variable from a project
 */
export async function deleteEnvironmentVariable(
  params: DeleteEnvironmentVariableParams
): Promise<{
  status: "success" | "error";
  error?: string;
}> {
  try {
    if (!params.apiToken) {
      return {
        status: "error",
        error: "Vercel API token not configured",
      };
    }

    await vercelRequest(
      `/v9/projects/${params.projectId}/env/${params.envId}`,
      params.apiToken,
      {
        method: "DELETE",
      },
      params.teamId
    );

    return {
      status: "success",
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
