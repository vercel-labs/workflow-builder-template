# AI Workflow Builder Template

A template for building your own AI-driven workflow automation platform. Built on top of Workflow DevKit, this template provides a complete visual workflow builder with real integrations and code generation capabilities.

![AI Workflow Builder Screenshot](screenshot.png)

## Deploy Your Own

You can deploy your own version of the workflow builder to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.new/workflow-builder)

**What happens during deployment:**

- **Automatic Database Setup**: A Neon Postgres database is automatically created and connected to your project
- **Environment Configuration**: You'll be prompted to provide required environment variables (Better Auth credentials and AI Gateway API key)
- **Ready to Use**: After deployment, you can start building workflows immediately

## What's Included

- **Visual Workflow Builder** - Drag-and-drop interface powered by React Flow
- **Workflow DevKit Integration** - Built on top of Workflow DevKit for powerful execution capabilities
- **Real Integrations** - Connect to Resend (emails), Linear (tickets), Slack, PostgreSQL, and external APIs
- **Code Generation** - Convert workflows to executable TypeScript with `"use workflow"` directive
- **Execution Tracking** - Monitor workflow runs with detailed logs
- **Authentication** - Secure user authentication with Better Auth
- **AI-Powered** - Generate workflows from natural language descriptions using OpenAI
- **Database** - PostgreSQL with Drizzle ORM for type-safe database access
- **Modern UI** - Beautiful shadcn/ui components with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm package manager

### Environment Variables

Create a `.env.local` file (or rename the existing `.env.example` file) with the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_builder

# Better Auth
BETTER_AUTH_SECRET=your-secret-key # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# AI Gateway (for AI workflow generation)
AI_GATEWAY_API_KEY=your-openai-api-key

# API URL (for application Route Handlers)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Credentials Encryption
INTEGRATION_ENCRYPTION_KEY=your-32-byte-hexadecimal-key # Generate with: openssl rand -hex 32
```

### Installation

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to get started.

## Workflow Types

### Trigger Nodes

- Webhook
- Schedule
- Manual
- Database Event

### Action Nodes

- **Send Email** - Send emails via Resend
- **Create Ticket** - Create Linear tickets
- **Database Query** - Query or update PostgreSQL
- **HTTP Request** - Call external APIs
- **Firecrawl** - Scrape websites and search the web

## Code Generation

Workflows can be converted to executable TypeScript code with the `"use workflow"` directive:

```typescript
export async function welcome(email: string, name: string, plan: string) {
  "use workflow";

  const { subject, body } = await generateEmail({
    name,
    plan,
  });

  const { status } = await sendEmail({
    to: email,
    subject,
    body,
  });

  return { status, subject, body };
}
```

### Generate Code for a Workflow

```bash
# Via API
GET /api/workflows/{id}/generate-code
```

The generated code includes:

- Type-safe TypeScript
- Real integration calls
- Error handling
- Execution logging

## API Endpoints

### Workflow Management

- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/{id}` - Get workflow by ID
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow

### Workflow Execution

- `POST /api/workflows/{id}/execute` - Execute a workflow
- `GET /api/workflows/{id}/executions` - Get execution history
- `GET /api/workflows/executions/{executionId}/logs` - Get detailed execution logs

### Code Generation

- `GET /api/workflows/{id}/generate-code` - Generate TypeScript code
- `POST /api/workflows/{id}/generate-code` - Generate with custom options

### AI Generation

- `POST /api/ai/generate-workflow` - Generate workflow from prompt

## Database Schema

### Tables

- `user` - User accounts
- `session` - User sessions
- `workflows` - Workflow definitions
- `workflow_executions` - Execution history
- `workflow_execution_logs` - Detailed node execution logs

## Development

### Scripts

```bash
# Development
pnpm dev

# Build
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm check

# Formatting
pnpm fix

# Database
pnpm db:generate  # Generate migrations
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
```

## Integrations

### Resend (Email)

Send transactional emails with Resend's API.

```typescript
import { sendEmail } from "@/lib/integrations/resend";

await sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  body: "Welcome to our platform",
});
```

### Linear (Tickets)

Create and manage Linear issues.

```typescript
import { createTicket } from "@/lib/integrations/linear";

await createTicket({
  title: "Bug Report",
  description: "Something is broken",
  priority: 1,
});
```

### PostgreSQL

Direct database access for queries and updates.

```typescript
import { queryData } from "@/lib/integrations/database";

await queryData("users", { email: "user@example.com" });
```

### External APIs

Make HTTP requests to any API.

```typescript
import { callApi } from "@/lib/integrations/api";

await callApi({
  url: "https://api.example.com/endpoint",
  method: "POST",
  body: { data: "value" },
});
```

### Firecrawl (Web Scraping)

Scrape websites and search the web with Firecrawl.

```typescript
import {
  firecrawlScrapeStep,
  firecrawlSearchStep,
} from "@/lib/steps/firecrawl";

// Scrape a URL
const scrapeResult = await firecrawlScrapeStep({
  url: "https://example.com",
  formats: ["markdown"],
});

// Search the web
const searchResult = await firecrawlSearchStep({
  query: "AI workflow builders",
  limit: 5,
});
```

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Workflow Engine**: Workflow DevKit
- **UI**: shadcn/ui with Tailwind CSS
- **State Management**: Jotai
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Code Editor**: Monaco Editor
- **Workflow Canvas**: React Flow
- **AI**: OpenAI GPT-5
- **Type Checking**: TypeScript
- **Code Quality**: Ultracite (formatter + linter)

## About Workflow DevKit

This template is built on top of Workflow DevKit, a powerful workflow execution engine that enables:

- Native TypeScript workflow definitions with `"use workflow"` directive
- Type-safe workflow execution
- Automatic code generation from visual workflows
- Built-in logging and error handling
- Serverless deployment support

Learn more about Workflow DevKit at [workflow.dev](https://useworkflow.dev)

## License

Apache 2.0
