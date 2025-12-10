# Neon Database Setup Guide

This guide documents how we set up Neon.tech PostgreSQL for the Workflow Builder project.

## What is Neon?

Neon is a serverless PostgreSQL database that offers:
- Free tier with 0.5 GB storage
- Auto-suspend after 5 minutes of inactivity (saves costs)
- Instant database branching (like git for databases)
- Connection pooling built-in

## Step-by-Step Setup

### 1. Create a Neon Account

1. Go to [https://console.neon.tech/](https://console.neon.tech/)
2. Sign up using GitHub, Google, or email
3. After signing in, you'll land on your dashboard

### 2. Create a New Project

When you first sign up, Neon automatically creates a project for you. If you need a new one:

1. Click "New Project" in the dashboard
2. Choose a project name (e.g., "workflow-builder")
3. Select a region closest to you (e.g., "US East")
4. Click "Create Project"

### 3. Get Your Connection String

1. From your project dashboard, click the "Connect" button (top right)
2. A dialog appears with connection details
3. Make sure "Connection pooling" is enabled (toggle should be ON)
4. Click "Show password" to reveal the full connection string
5. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### 4. Configure Environment Variables

Create a `.env.local` file in your project root (this file is gitignored):

```env
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://your-connection-string-here

# Authentication (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-generated-secret

# Credentials Encryption (generate with: openssl rand -hex 32)
INTEGRATION_ENCRYPTION_KEY=your-64-char-hex-string

# App URLs
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Also copy to `.env` for Drizzle migrations:
```bash
cp .env.local .env
```

### 5. Push Database Schema

Run the following command to create all tables:

```bash
pnpm db:push
```

This uses Drizzle ORM to push the schema defined in `lib/db/schema.ts` to your database.

### 6. Start the Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) - you should see the workflow builder!

## How the Database Works in This Project

### Technology Stack

- **Drizzle ORM**: Type-safe database toolkit for TypeScript
- **PostgreSQL**: The database engine (hosted on Neon)
- **Better Auth**: Authentication library that stores users/sessions in the database

### Database Schema

The schema is defined in `lib/db/schema.ts` and includes:

| Table | Purpose |
|-------|---------|
| `user` | User accounts (email, name, password hash) |
| `session` | Active login sessions |
| `account` | OAuth provider connections |
| `verification` | Email verification tokens |
| `workflows` | Workflow definitions (nodes, edges, config) |
| `workflow_executions` | Workflow run history |
| `workflow_execution_logs` | Detailed step-by-step logs |
| `api_keys` | User API keys for programmatic access |

### Database Commands

```bash
# Push schema changes to database (no migration files)
pnpm db:push

# Generate migration files (for production)
pnpm db:generate

# Open Drizzle Studio (visual database browser)
pnpm db:studio
```

### Connection Flow

1. App reads `DATABASE_URL` from environment
2. `lib/db/index.ts` creates a connection pool using `postgres` driver
3. Drizzle ORM wraps the connection for type-safe queries
4. API routes and server components use `db` to query data

## Troubleshooting

### "database does not exist" Error

Make sure your `DATABASE_URL` points to the correct database name (usually `neondb`).

### Connection Timeout

Neon auto-suspends after 5 min idle. First request after suspend has ~500ms cold start. This is normal.

### Schema Push Fails

1. Check `DATABASE_URL` is set correctly in both `.env` and `.env.local`
2. Ensure your Neon project is active (not suspended)
3. Try running `pnpm db:push` again

## Security Notes

- Never commit `.env` or `.env.local` files
- These files are already in `.gitignore`
- Rotate `BETTER_AUTH_SECRET` and `INTEGRATION_ENCRYPTION_KEY` if exposed
- Neon connection strings include passwords - keep them secret!

## Useful Links

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better Auth Docs](https://better-auth.com/)

