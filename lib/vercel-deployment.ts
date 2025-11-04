import 'server-only';

import { Sandbox } from '@vercel/sandbox';
import ms from 'ms';
import type { WorkflowNode, WorkflowEdge } from './workflow-store';
import { generateWorkflowSDKCode } from './workflow-codegen-sdk';

export interface DeploymentOptions {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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
    logs.push('Starting deployment process...');
    logs.push('Generating workflow code...');

    // Generate the workflow code
    const workflowCode = generateWorkflowSDKCode(
      options.workflowName,
      options.nodes,
      options.edges
    );

    logs.push('Workflow code generated successfully');
    logs.push(`Generated code length: ${workflowCode.length} characters`);

    // Get all project files
    const files = await generateProjectFiles(options);

    // Add Vercel project configuration to link to the specific project
    files['.vercel/project.json'] = JSON.stringify(
      {
        projectId: options.vercelProjectId,
        orgId: options.vercelTeamId || undefined,
      },
      null,
      2
    );

    // Add Vercel configuration for Next.js
    files['vercel.json'] = JSON.stringify(
      {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
      },
      null,
      2
    );

    logs.push(`Generated ${Object.keys(files).length} project files`);

    // Create sandbox environment
    logs.push('Creating Vercel sandbox...');

    // Build sandbox config - only include teamId/projectId if they exist
    const sandboxConfig: {
      token: string;
      resources: { vcpus: number };
      timeout: number;
      ports: number[];
      runtime: 'node22';
      teamId?: string;
      projectId?: string;
    } = {
      token: options.vercelToken,
      resources: { vcpus: 4 },
      timeout: ms('10m'),
      ports: [3000],
      runtime: 'node22',
    };

    if (options.vercelTeamId) {
      sandboxConfig.teamId = options.vercelTeamId;
    }

    if (options.vercelProjectId) {
      sandboxConfig.projectId = options.vercelProjectId;
    }

    try {
      console.log('Creating sandbox with config:', sandboxConfig);
      sandbox = await Sandbox.create(sandboxConfig);
      logs.push('Sandbox created successfully');
    } catch (sandboxError) {
      const errorMsg = sandboxError instanceof Error ? sandboxError.message : String(sandboxError);
      logs.push(`Failed to create sandbox: ${errorMsg}`);

      if (errorMsg.includes('404')) {
        throw new Error(
          'Failed to create Vercel Sandbox (404). Please verify:\n' +
            '1. Your Vercel API token is valid and has the correct permissions\n' +
            '2. Your team ID is correct (if using a team)\n' +
            '3. The project ID exists and you have access to it\n' +
            '4. You have access to create sandboxes on your Vercel plan'
        );
      }

      if (errorMsg.includes('Missing credentials') || errorMsg.includes('projectId')) {
        throw new Error(
          'Vercel Sandbox requires a project ID. Please:\n' +
            '1. Create a Vercel project first\n' +
            '2. Link this workflow to a Vercel project in the workflow settings\n' +
            '3. Or create a new project via the Vercel dashboard'
        );
      }

      throw sandboxError;
    }

    // Write all project files to sandbox
    logs.push('Writing project files to sandbox...');
    const fileEntries = Object.entries(files).map(([path, content]) => ({
      path,
      content: Buffer.from(content, 'utf-8'),
    }));
    await sandbox.writeFiles(fileEntries);
    logs.push('Files written successfully');

    // Install dependencies
    logs.push('Installing dependencies...');
    const install = await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '--loglevel', 'info'],
    });

    if (install.exitCode !== 0) {
      const stderrOutput = install.stderr ? await install.stderr() : 'Unknown error';
      throw new Error(`Failed to install dependencies: ${stderrOutput}`);
    }
    logs.push('Dependencies installed successfully');

    // Build the project
    logs.push('Building Next.js project...');
    const build = await sandbox.runCommand({
      cmd: 'npm',
      args: ['run', 'build'],
    });

    if (build.exitCode !== 0) {
      const stderrOutput = build.stderr ? await build.stderr() : 'Unknown error';
      throw new Error(`Build failed: ${stderrOutput}`);
    }
    logs.push('Project built successfully');

    // Deploy to Vercel
    logs.push('Deploying to Vercel...');
    const deployArgs = [
      'vercel',
      'deploy',
      '--prod',
      '--yes', // Non-interactive confirmation
      '--token',
      options.vercelToken,
    ];
    if (options.vercelTeamId) {
      deployArgs.push('--scope', options.vercelTeamId);
    }

    const deploy = await sandbox.runCommand({
      cmd: 'npx',
      args: deployArgs,
    });

    if (deploy.exitCode !== 0) {
      const stderrOutput = deploy.stderr ? await deploy.stderr() : 'Unknown error';
      throw new Error(`Deployment failed: ${stderrOutput}`);
    }

    // Parse deployment output to get the production URL
    const deployOutput = deploy.stdout ? await deploy.stdout() : '';
    const lines = deployOutput.split('\n');

    // Look for the Production URL line
    const productionLine = lines.find((line) => line.includes('Production:'));
    let deploymentUrl = '';

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

    // Construct the API endpoint URL for triggering the workflow
    const workflowFileName = sanitizeFileName(options.workflowName);
    const apiEndpointUrl = `${deploymentUrl}/api/workflows/${workflowFileName}`;

    logs.push(`Deployment successful: ${deploymentUrl}`);
    logs.push(`API endpoint: ${apiEndpointUrl}`);

    return {
      success: true,
      deploymentUrl: apiEndpointUrl, // Store the API endpoint URL
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      logs,
    };
  } finally {
    // Sandbox is automatically cleaned up after timeout
    if (sandbox) {
      logs.push('Sandbox will be automatically cleaned up');
    }
  }
}

/**
 * Generate all project files for the Next.js workflow app
 */
async function generateProjectFiles(options: DeploymentOptions): Promise<Record<string, string>> {
  const { workflowName, nodes, edges } = options;

  // Generate workflow code
  const workflowCode = generateWorkflowSDKCode(workflowName, nodes, edges);

  // Generate package.json
  const packageJson = {
    name: `workflow-${options.workflowId}`,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: '16.0.1',
      react: '19.2.0',
      'react-dom': '19.2.0',
      workflow: '4.0.1-beta.7',
      // Add integration dependencies based on nodes
      ...getIntegrationDependencies(nodes),
    },
  };

  // Generate next.config.ts
  const nextConfig = `import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withWorkflow(nextConfig);
`;

  // Generate tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [
        {
          name: 'next',
        },
        {
          name: 'workflow',
        },
      ],
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };

  // Generate API route to trigger workflow
  const apiRoute = `import { start } from 'workflow/api';
import { ${sanitizeFunctionName(workflowName)} } from '@/workflows/${sanitizeFileName(workflowName)}';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Start the workflow execution
    await start(${sanitizeFunctionName(workflowName)}, [body]);
    
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

  // Generate app layout
  const appLayout = `export default function RootLayout({
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

  // Generate app page
  const appPage = `export default function Home() {
  return (
    <main>
      <h1>Workflow: ${workflowName}</h1>
      <p>Workflow is running. Trigger via API at /api/workflows/${sanitizeFileName(workflowName)}</p>
    </main>
  );
}
`;

  return {
    'package.json': JSON.stringify(packageJson, null, 2),
    'next.config.ts': nextConfig,
    'tsconfig.json': JSON.stringify(tsConfig, null, 2),
    [`workflows/${sanitizeFileName(workflowName)}.ts`]: workflowCode,
    [`app/api/workflows/${sanitizeFileName(workflowName)}/route.ts`]: apiRoute,
    'app/layout.tsx': appLayout,
    'app/page.tsx': appPage,
    '.gitignore': `node_modules
.next
.env*.local
`,
  };
}

/**
 * Get npm dependencies based on workflow nodes
 */
function getIntegrationDependencies(nodes: WorkflowNode[]): Record<string, string> {
  const deps: Record<string, string> = {};

  for (const node of nodes) {
    const actionType = node.data.config?.actionType as string;

    if (actionType === 'Send Email') {
      deps['resend'] = '^6.4.0';
    } else if (actionType === 'Create Ticket' || actionType === 'Find Issues') {
      deps['@linear/sdk'] = '^63.2.0';
    } else if (actionType === 'Send Slack Message') {
      deps['@slack/web-api'] = '^7.12.0';
    } else if (actionType === 'Generate Text' || actionType === 'Generate Image') {
      deps['ai'] = '^5.0.86';
      deps['openai'] = '^6.8.0';
      deps['@google/genai'] = '^1.28.0';
      deps['zod'] = '^4.1.12';
    }
  }

  return deps;
}

/**
 * Sanitize workflow name for use as function name
 */
function sanitizeFunctionName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_');
}

/**
 * Sanitize workflow name for use as file name
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
