import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { generateWorkflowModule } from "@/lib/workflow-codegen";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { getAllEnvVars, getDependenciesForActions } from "@/plugins";

// Path to the Next.js boilerplate directory
const BOILERPLATE_PATH = join(process.cwd(), "lib", "next-boilerplate");

// Path to the codegen templates directory
const CODEGEN_TEMPLATES_PATH = join(process.cwd(), "lib", "codegen-templates");

// Regex patterns for code generation
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9\s]/g;
const WHITESPACE_SPLIT_REGEX = /\s+/;
const TEMPLATE_EXPORT_REGEX = /export default `([\s\S]*)`/;

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

  // Generate camelCase function name (same as Code tab)
  const baseName =
    workflow.name
      .replace(NON_ALPHANUMERIC_REGEX, "")
      .split(WHITESPACE_SPLIT_REGEX)
      .map((word, i) => {
        if (i === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("") || "execute";

  const functionName = `${baseName}Workflow`;

  // Generate code for the workflow using the same generator as the Code tab
  const workflowCode = generateWorkflowModule(
    workflow.name,
    workflow.nodes,
    workflow.edges,
    { functionName }
  );
  const fileName = sanitizeFileName(workflow.name);

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
 * Uses the plugin registry to dynamically determine required dependencies
 */
function getIntegrationDependencies(
  nodes: WorkflowNode[]
): Record<string, string> {
  // Collect all action types used in the workflow
  const actionTypes = nodes
    .filter((node) => node.data.type === "action")
    .map((node) => node.data.config?.actionType as string)
    .filter(Boolean);

  // Get dependencies from plugin registry
  return getDependenciesForActions(actionTypes);
}

/**
 * Generate .env.example content based on registered integrations
 */
function generateEnvExample(): string {
  const lines = ["# Add your environment variables here"];

  // Add system integration env vars
  lines.push("");
  lines.push("# For database integrations");
  lines.push("DATABASE_URL=your_database_url");

  // Add plugin env vars from registry
  const envVars = getAllEnvVars();
  const groupedByPrefix: Record<
    string,
    Array<{ name: string; description: string }>
  > = {};

  for (const envVar of envVars) {
    const prefix = envVar.name.split("_")[0];
    if (!groupedByPrefix[prefix]) {
      groupedByPrefix[prefix] = [];
    }
    groupedByPrefix[prefix].push(envVar);
  }

  for (const [prefix, vars] of Object.entries(groupedByPrefix)) {
    lines.push(
      `# For ${prefix.charAt(0) + prefix.slice(1).toLowerCase()} integration`
    );
    for (const v of vars) {
      lines.push(`${v.name}=your_${v.name.toLowerCase()}`);
    }
    lines.push("");
  }

  return lines.join("\n");
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

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Read boilerplate files
    const boilerplateFiles = await readDirectoryRecursive(BOILERPLATE_PATH);

    // Read codegen template files and convert them to actual step files
    const templateFiles = await readDirectoryRecursive(CODEGEN_TEMPLATES_PATH);

    // Convert template exports to actual step files
    const stepFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(templateFiles)) {
      // Extract the template string from the export default statement
      const templateMatch = content.match(TEMPLATE_EXPORT_REGEX);
      if (templateMatch) {
        stepFiles[`lib/steps/${path}`] = templateMatch[1];
      }
    }

    // Generate workflow-specific files
    const workflowFiles = generateWorkflowFiles({
      name: workflow.name,
      nodes: workflow.nodes as WorkflowNode[],
      edges: workflow.edges as WorkflowEdge[],
    });

    // Merge boilerplate, step files, and workflow files
    const allFiles = { ...boilerplateFiles, ...stepFiles, ...workflowFiles };

    // Update package.json to include workflow dependencies
    const packageJson = JSON.parse(allFiles["package.json"]);
    packageJson.dependencies = {
      ...packageJson.dependencies,
      workflow: "4.0.1-beta.7",
      ...getIntegrationDependencies(workflow.nodes as WorkflowNode[]),
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

This is a Next.js workflow project generated from Workflow Builder.

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

    // Add .env.example file (dynamically generated from plugin registry)
    allFiles[".env.example"] = generateEnvExample();

    return NextResponse.json({
      success: true,
      files: allFiles,
    });
  } catch (error) {
    console.error("Failed to prepare workflow download:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare workflow download",
      },
      { status: 500 }
    );
  }
}
