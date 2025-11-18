# V8 Workflow Builder

A powerful visual workflow builder with real integrations and code generation capabilities.

## Features

- **Visual Workflow Builder** - Drag-and-drop interface powered by React Flow
- **Real Integrations** - Connect to Resend (emails), Linear (tickets), PostgreSQL, and external APIs
- **Code Generation** - Convert workflows to executable TypeScript with `"use workflow"` directive
- **Execution Tracking** - Monitor workflow runs with detailed logs
- **Authentication** - Secure user authentication with Better Auth
- **AI-Powered** - Generate workflows from natural language descriptions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm package manager

### Environment Variables

Create a `.env.local` file with the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/v8_workflow

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Vercel (App-level - all projects created with workflow-builder- prefix)
VERCEL_API_TOKEN=your-vercel-api-token
VERCEL_TEAM_ID=team_xxxxxxxxxxxxx  # Optional, for team projects

# Resend (Email)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Linear (Tickets)
LINEAR_API_KEY=your-linear-api-key

# OpenAI (for AI workflow generation)
OPENAI_API_KEY=your-openai-api-key
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

### Condition Nodes

- Conditional branching based on data

### Transform Nodes

- Data transformation and mapping

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
pnpm lint

# Formatting
pnpm format

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

## License

MIT
