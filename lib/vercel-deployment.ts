import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Vercel } from "@vercel/sdk";
import { generateWorkflowSDKCode } from "./workflow-codegen-sdk";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

// Path to the Next.js boilerplate directory
const BOILERPLATE_PATH = join(process.cwd(), "lib", "next-boilerplate");

// Regex pattern for numeric starts
const NUMERIC_START_PATTERN = /^[0-9]/;

export type DeploymentOptions = {
  workflows: Array<{
    id: string;
    name: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }>;
  vercelToken: string;
  vercelTeamId?: string;
  vercelProjectId?: string;
};

export type DeploymentResult = {
  success: boolean;
  deploymentUrl?: string;
  error?: string;
  logs?: string[];
};

/**
 * Recursively read all files from a directory
 */
async function readDirectoryRecursive(
  dirPath: string,
  baseDir: string = dirPath
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively read subdirectories
      const subFiles = await readDirectoryRecursive(fullPath, baseDir);
      Object.assign(files, subFiles);
    } else if (entry.isFile()) {
      // Read file content
      const content = await readFile(fullPath, "utf-8");
      // Use relative path from base directory
      const relativePath = fullPath.substring(baseDir.length + 1);
      files[relativePath] = content;
    }
  }

  return files;
}

/**
 * Deploy a workflow to Vercel using Vercel SDK
 */
export async function deployWorkflowToVercel(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const logs: string[] = [];

  try {
    logs.push("Starting deployment process...");
    logs.push(`Deploying ${options.workflows.length} workflow(s)...`);

    // Initialize Vercel SDK
    const vercel = new Vercel({
      bearerToken: options.vercelToken,
    });

    // Read boilerplate files
    logs.push("Reading boilerplate files...");
    const boilerplateFiles = await readDirectoryRecursive(BOILERPLATE_PATH);
    logs.push(`Read ${Object.keys(boilerplateFiles).length} boilerplate files`);

    // Generate workflow-specific files
    logs.push("Generating workflow files...");
    const workflowFiles = generateWorkflowFiles(options);
    logs.push(`Generated ${Object.keys(workflowFiles).length} workflow files`);

    // Merge boilerplate and workflow files
    const allFiles = { ...boilerplateFiles, ...workflowFiles };

    // Update package.json to include workflow dependencies
    const packageJson = JSON.parse(allFiles["package.json"]);
    const allNodes = options.workflows.flatMap((w) => w.nodes);
    packageJson.dependencies = {
      ...packageJson.dependencies,
      workflow: "4.0.1-beta.7",
      ...getIntegrationDependencies(allNodes),
    };
    allFiles["package.json"] = JSON.stringify(packageJson, null, 2);

    // Update next.config.ts to include workflow plugin
    allFiles["next.config.ts"] = `import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withWorkflow(nextConfig);
`;

    // Update tsconfig.json to include workflow plugin
    const tsConfig = JSON.parse(allFiles["tsconfig.json"]);
    tsConfig.compilerOptions.plugins = [{ name: "next" }, { name: "workflow" }];
    allFiles["tsconfig.json"] = JSON.stringify(tsConfig, null, 2);

    // Add .vercel/project.json to link to the specific project
    allFiles[".vercel/project.json"] = JSON.stringify(
      {
        projectId: options.vercelProjectId,
        orgId: options.vercelTeamId || undefined,
      },
      null,
      2
    );

    logs.push(`Total files to deploy: ${Object.keys(allFiles).length}`);

    // Convert files to Vercel deployment format
    const deploymentFiles = Object.entries(allFiles).map(([path, content]) => ({
      file: path,
      data: content,
    }));

    // Create deployment
    logs.push("Creating deployment...");
    const createResponse = await vercel.deployments.createDeployment({
      teamId: options.vercelTeamId,
      requestBody: {
        name: options.vercelProjectId || "workflow",
        files: deploymentFiles,
        target: "production",
        projectSettings: {
          framework: "nextjs",
          buildCommand: "npm run build",
          devCommand: "npm run dev",
          installCommand: "npm install",
        },
      },
    });

    const deploymentId = createResponse.id;
    const deploymentUrl = createResponse.url;

    logs.push(
      `Deployment created: ID ${deploymentId} (status: ${createResponse.readyState})`
    );
    logs.push(`Deployment URL: https://${deploymentUrl}`);

    // Poll deployment status
    logs.push("Waiting for deployment to complete...");
    let deploymentStatus = createResponse.readyState;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 seconds * 60)

    while (
      (deploymentStatus === "BUILDING" ||
        deploymentStatus === "INITIALIZING" ||
        deploymentStatus === "QUEUED") &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts += 1;

      const statusResponse = await vercel.deployments.getDeployment({
        idOrUrl: deploymentId,
        teamId: options.vercelTeamId,
      });

      deploymentStatus = statusResponse.readyState;
      logs.push(
        `Deployment status: ${deploymentStatus} (${attempts}/${maxAttempts})`
      );
    }

    if (deploymentStatus === "READY") {
      logs.push("Deployment successful!");
      logs.push(
        `Deployed ${options.workflows.length} workflow(s) to production`
      );

      return {
        success: true,
        deploymentUrl: `https://${deploymentUrl}`,
        logs,
      };
    }

    if (deploymentStatus === "ERROR") {
      logs.push("Deployment failed with error status");
      return {
        success: false,
        error: "Deployment failed",
        logs,
      };
    }

    if (deploymentStatus === "CANCELED") {
      logs.push("Deployment was canceled");
      return {
        success: false,
        error: "Deployment was canceled",
        logs,
      };
    }

    // Timeout
    logs.push("Deployment timed out");
    return {
      success: false,
      error: "Deployment timed out after 5 minutes",
      logs,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logs.push(`Error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      logs,
    };
  }
}

/**
 * Generate workflow-specific files
 */
function generateWorkflowFiles(
  options: DeploymentOptions
): Record<string, string> {
  const files: Record<string, string> = {};

  // Generate code for each workflow
  const workflowMetadata: Array<{
    name: string;
    fileName: string;
    functionName: string;
  }> = [];

  for (const workflow of options.workflows) {
    const workflowCode = generateWorkflowSDKCode(
      workflow.name,
      workflow.nodes,
      workflow.edges
    );
    const fileName = sanitizeFileName(workflow.name);
    const functionName = sanitizeFunctionName(workflow.name);

    workflowMetadata.push({ name: workflow.name, fileName, functionName });

    // Add workflow file
    files[`workflows/${fileName}.ts`] = workflowCode;

    // Add API route for this workflow
    files[`app/api/workflows/${fileName}/route.ts`] =
      `import { start } from 'workflow/api';
import { ${functionName} } from '@/workflows/${fileName}';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Start the workflow execution
    await start(${functionName}, [body]);
    
    return NextResponse.json({
      success: true,
      message: 'Workflow started successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
`;
  }

  // Update app/page.tsx with workflow list
  const workflowsList = workflowMetadata
    .map(
      (wf) =>
        `        <li key="${wf.fileName}">
          <a href="/api/workflows/${wf.fileName}" className="text-blue-600 hover:underline">
            ${wf.name}
          </a>
        </li>`
    )
    .join("\n");

  files["app/page.tsx"] = `export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workflows</h1>
      <p className="mb-4 text-gray-600">Available workflow endpoints:</p>
      <ul className="list-disc pl-6 space-y-2">
${workflowsList}
      </ul>
    </main>
  );
}
`;

  return files;
}

/**
 * Get npm dependencies based on workflow nodes
 */
function getIntegrationDependencies(
  nodes: WorkflowNode[]
): Record<string, string> {
  const deps: Record<string, string> = {};

  for (const node of nodes) {
    const actionType = node.data.config?.actionType as string;

    if (actionType === "Send Email") {
      deps.resend = "^6.4.0";
    } else if (actionType === "Create Ticket" || actionType === "Find Issues") {
      deps["@linear/sdk"] = "^63.2.0";
    } else if (actionType === "Send Slack Message") {
      deps["@slack/web-api"] = "^7.12.0";
    } else if (
      actionType === "Generate Text" ||
      actionType === "Generate Image"
    ) {
      deps.ai = "^5.0.86";
      deps.openai = "^6.8.0";
      deps["@google/genai"] = "^1.28.0";
      deps.zod = "^4.1.12";
    }
  }

  return deps;
}

/**
 * Sanitize workflow name for use as function name
 */
function sanitizeFunctionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(NUMERIC_START_PATTERN, "_$&")
    .replace(/_+/g, "_");
}

/**
 * Sanitize workflow name for use as file name
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
