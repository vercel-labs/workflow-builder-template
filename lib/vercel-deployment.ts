import "server-only";

import { Sandbox } from "@vercel/sandbox";
import ms from "ms";
import { generateWorkflowSDKCode } from "./workflow-codegen-sdk";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

export interface DeploymentOptions {
  workflows: Array<{
    id: string;
    name: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }>;
  vercelToken: string;
  vercelTeamId?: string;
  vercelProjectId?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  error?: string;
  logs?: string[];
}

/**
 * Deploy a workflow to Vercel using Sandbox
 */
export async function deployWorkflowToVercel(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const logs: string[] = [];
  let sandbox: Sandbox | null = null;

  try {
    logs.push("Starting deployment process...");
    logs.push(`Deploying ${options.workflows.length} workflow(s)...`);

    // Get all project files with all workflows
    const files = await generateProjectFiles(options);
    logs.push(`Generated code for ${options.workflows.length} workflow(s)`);

    // Add Vercel project configuration to link to the specific project
    files[".vercel/project.json"] = JSON.stringify(
      {
        projectId: options.vercelProjectId,
        orgId: options.vercelTeamId || undefined,
      },
      null,
      2
    );

    // Add Vercel configuration for Next.js
    files["vercel.json"] = JSON.stringify(
      {
        framework: "nextjs",
        buildCommand: "npm run build",
        devCommand: "npm run dev",
        installCommand: "npm install",
      },
      null,
      2
    );

    logs.push(`Generated ${Object.keys(files).length} project files`);

    // Create sandbox environment
    logs.push("Creating Vercel sandbox...");

    // Build sandbox config - only include teamId/projectId if they exist
    const sandboxConfig: {
      token: string;
      resources: { vcpus: number };
      timeout: number;
      ports: number[];
      runtime: "node22";
      teamId?: string;
      projectId?: string;
    } = {
      token: options.vercelToken,
      resources: { vcpus: 4 },
      timeout: ms("10m"),
      ports: [3000],
      runtime: "node22",
    };

    if (options.vercelTeamId) {
      sandboxConfig.teamId = options.vercelTeamId;
    }

    if (options.vercelProjectId) {
      sandboxConfig.projectId = options.vercelProjectId;
    }

    try {
      console.log("Creating sandbox with config:", sandboxConfig);
      sandbox = await Sandbox.create(sandboxConfig);
      logs.push("Sandbox created successfully");
    } catch (sandboxError) {
      const errorMsg =
        sandboxError instanceof Error
          ? sandboxError.message
          : String(sandboxError);
      logs.push(`Failed to create sandbox: ${errorMsg}`);

      if (errorMsg.includes("404")) {
        throw new Error(
          "Failed to create Vercel Sandbox (404). Please verify:\n" +
            "1. Your Vercel API token is valid and has the correct permissions\n" +
            "2. Your team ID is correct (if using a team)\n" +
            "3. The project ID exists and you have access to it\n" +
            "4. You have access to create sandboxes on your Vercel plan"
        );
      }

      if (
        errorMsg.includes("Missing credentials") ||
        errorMsg.includes("projectId")
      ) {
        throw new Error(
          "Vercel Sandbox requires a project ID. Please:\n" +
            "1. Create a Vercel project first\n" +
            "2. Link this workflow to a Vercel project in the workflow settings\n" +
            "3. Or create a new project via the Vercel dashboard"
        );
      }

      throw sandboxError;
    }

    // Write all project files to sandbox
    logs.push("Writing project files to sandbox...");
    const fileEntries = Object.entries(files).map(([path, content]) => ({
      path,
      content: Buffer.from(content, "utf-8"),
    }));
    await sandbox.writeFiles(fileEntries);
    logs.push("Files written successfully");

    // Install dependencies
    logs.push("Installing dependencies...");
    const install = await sandbox.runCommand({
      cmd: "npm",
      args: ["install", "--loglevel", "info"],
    });

    if (install.exitCode !== 0) {
      const stderrOutput = install.stderr
        ? await install.stderr()
        : "Unknown error";
      throw new Error(`Failed to install dependencies: ${stderrOutput}`);
    }
    logs.push("Dependencies installed successfully");

    // Build the project
    logs.push("Building Next.js project...");
    const build = await sandbox.runCommand({
      cmd: "npm",
      args: ["run", "build"],
    });

    if (build.exitCode !== 0) {
      const stderrOutput = build.stderr
        ? await build.stderr()
        : "Unknown error";
      throw new Error(`Build failed: ${stderrOutput}`);
    }
    logs.push("Project built successfully");

    // Deploy to Vercel
    logs.push("Deploying to Vercel...");
    const deployArgs = [
      "vercel",
      "deploy",
      "--prod",
      "--yes", // Non-interactive confirmation
      "--token",
      options.vercelToken,
    ];
    if (options.vercelTeamId) {
      deployArgs.push("--scope", options.vercelTeamId);
    }

    const deploy = await sandbox.runCommand({
      cmd: "npx",
      args: deployArgs,
    });

    if (deploy.exitCode !== 0) {
      const stderrOutput = deploy.stderr
        ? await deploy.stderr()
        : "Unknown error";
      throw new Error(`Deployment failed: ${stderrOutput}`);
    }

    // Parse deployment output to get the production URL
    const deployOutput = deploy.stdout ? await deploy.stdout() : "";
    const lines = deployOutput.split("\n");

    // Look for the Production URL line
    const productionLine = lines.find((line) => line.includes("Production:"));
    let deploymentUrl = "";

    if (productionLine) {
      // Extract URL from line like "Production: https://my-app.vercel.app [1s]"
      const urlMatch = productionLine.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        deploymentUrl = urlMatch[0];
      }
    }

    if (!deploymentUrl) {
      // Fallback: try to find any https URL in the output
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
      if (urlMatch) {
        deploymentUrl = urlMatch[0];
      }
    }

    logs.push(`Deployment successful: ${deploymentUrl}`);
    logs.push(`Deployed ${options.workflows.length} workflow(s) to production`);

    return {
      success: true,
      deploymentUrl, // Store the base deployment URL
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
  } finally {
    // Sandbox is automatically cleaned up after timeout
    if (sandbox) {
      logs.push("Sandbox will be automatically cleaned up");
    }
  }
}

/**
 * Generate all project files for the Next.js workflow app
 */
async function generateProjectFiles(
  options: DeploymentOptions
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  // Generate code for each workflow
  const workflowFiles: Array<{ name: string; code: string; fileName: string }> =
    [];

  for (const workflow of options.workflows) {
    const workflowCode = generateWorkflowSDKCode(
      workflow.name,
      workflow.nodes,
      workflow.edges
    );
    const fileName = sanitizeFileName(workflow.name);

    workflowFiles.push({
      name: workflow.name,
      code: workflowCode,
      fileName,
    });

    // Add workflow file
    files[`workflows/${fileName}.ts`] = workflowCode;

    // Add API route for this workflow
    const functionName = sanitizeFunctionName(workflow.name);
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

  // Collect all nodes from all workflows for dependency detection
  const allNodes = options.workflows.flatMap((w) => w.nodes);

  // Generate package.json
  const packageJson = {
    name: "workflows",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
    },
    dependencies: {
      next: "16.0.1",
      react: "19.2.0",
      "react-dom": "19.2.0",
      workflow: "4.0.1-beta.7",
      // Add integration dependencies based on all nodes
      ...getIntegrationDependencies(allNodes),
    },
  };

  // Generate next.config.ts
  const nextConfig = `import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withWorkflow(nextConfig);
`;

  // Generate app page listing all workflows
  const workflowsList = workflowFiles
    .map(
      (wf) => `<li><a href="/api/workflows/${wf.fileName}">${wf.name}</a></li>`
    )
    .join("\n          ");

  files["app/page.tsx"] = `export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workflows</h1>
      <p className="mb-4">Available workflow endpoints:</p>
      <ul className="list-disc pl-6 space-y-2">
        ${workflowsList}
      </ul>
    </main>
  );
}
`;

  files["app/layout.tsx"] = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

  files["package.json"] = JSON.stringify(packageJson, null, 2);
  files["next.config.ts"] = nextConfig;
  files[".gitignore"] = `node_modules
.next
.env*.local
`;

  const tsConfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [
        {
          name: "next",
        },
        {
          name: "workflow",
        },
      ],
      paths: {
        "@/*": ["./*"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };

  files["tsconfig.json"] = JSON.stringify(tsConfig, null, 2);

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
      deps["resend"] = "^6.4.0";
    } else if (actionType === "Create Ticket" || actionType === "Find Issues") {
      deps["@linear/sdk"] = "^63.2.0";
    } else if (actionType === "Send Slack Message") {
      deps["@slack/web-api"] = "^7.12.0";
    } else if (
      actionType === "Generate Text" ||
      actionType === "Generate Image"
    ) {
      deps["ai"] = "^5.0.86";
      deps["openai"] = "^6.8.0";
      deps["@google/genai"] = "^1.28.0";
      deps["zod"] = "^4.1.12";
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
    .replace(/^[0-9]/, "_$&")
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
