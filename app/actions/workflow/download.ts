"use server";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateWorkflowSDKCode } from "@/lib/workflow-codegen-sdk";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { getSession, verifyWorkflowOwnership } from "./utils";

// Path to the Next.js boilerplate directory
const BOILERPLATE_PATH = join(process.cwd(), "lib", "next-boilerplate");

// Regex pattern for numeric starts
const NUMERIC_START_PATTERN = /^[0-9]/;

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
 * Generate workflow-specific files
 */
function generateWorkflowFiles(workflow: {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}): Record<string, string> {
  const files: Record<string, string> = {};

  // Generate code for the workflow
  const workflowCode = generateWorkflowSDKCode(
    workflow.name,
    workflow.nodes,
    workflow.edges
  );
  const fileName = sanitizeFileName(workflow.name);
  const functionName = sanitizeFunctionName(workflow.name);

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

  // Update app/page.tsx with workflow details
  files["app/page.tsx"] = `export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workflow: ${workflow.name}</h1>
      <p className="mb-4 text-gray-600">API endpoint:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <a href="/api/workflows/${fileName}" className="text-blue-600 hover:underline">
            /api/workflows/${fileName}
          </a>
        </li>
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

/**
 * Prepare workflow files for download
 */
export async function prepareWorkflowDownload(id: string): Promise<{
  success: boolean;
  files?: Record<string, string>;
  error?: string;
}> {
  try {
    const session = await getSession();
    const workflow = await verifyWorkflowOwnership(id, session.user.id);

    // Read boilerplate files
    const boilerplateFiles = await readDirectoryRecursive(BOILERPLATE_PATH);

    // Generate workflow-specific files
    const workflowFiles = generateWorkflowFiles({
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
    });

    // Merge boilerplate and workflow files
    const allFiles = { ...boilerplateFiles, ...workflowFiles };

    // Update package.json to include workflow dependencies
    const packageJson = JSON.parse(allFiles["package.json"]);
    packageJson.dependencies = {
      ...packageJson.dependencies,
      workflow: "4.0.1-beta.7",
      ...getIntegrationDependencies(workflow.nodes),
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

    // Add a README with instructions
    allFiles["README.md"] = `# ${workflow.name}

This is a Next.js workflow project generated from V8 Workflow.

## Getting Started

1. Install dependencies:
\`\`\`bash
pnpm install
\`\`\`

2. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Run the development server:
\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Workflow API

Your workflow is available at \`/api/workflows/${sanitizeFileName(workflow.name)}\`.

Send a POST request with a JSON body to trigger the workflow:

\`\`\`bash
curl -X POST http://localhost:3000/api/workflows/${sanitizeFileName(workflow.name)} \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'
\`\`\`

## Deployment

Deploy your workflow to Vercel:

\`\`\`bash
vercel deploy
\`\`\`

For more information, visit the [Workflow documentation](https://workflow.is).
`;

    // Add .env.example file
    allFiles[".env.example"] = `# Add your environment variables here
# For Resend email integration
RESEND_API_KEY=your_resend_api_key

# For Linear integration
LINEAR_API_KEY=your_linear_api_key

# For Slack integration
SLACK_BOT_TOKEN=your_slack_bot_token

# For AI integrations
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key

# For database integrations
DATABASE_URL=your_database_url
`;

    return {
      success: true,
      files: allFiles,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
