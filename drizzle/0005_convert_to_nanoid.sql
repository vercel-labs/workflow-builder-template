-- WARNING: This migration will drop and recreate workflow-related tables
-- All workflow data, executions, and logs will be lost
-- Only run this in development or after backing up data

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "workflow_execution_logs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workflow_executions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workflows" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "data_sources" CASCADE;--> statement-breakpoint

-- Recreate workflows table with text IDs
CREATE TABLE "workflows" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "userId" text NOT NULL REFERENCES "user"("id"),
  "nodes" jsonb NOT NULL,
  "edges" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Recreate workflow_executions table with text IDs
CREATE TABLE "workflow_executions" (
  "id" text PRIMARY KEY NOT NULL,
  "workflow_id" text NOT NULL REFERENCES "workflows"("id"),
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "status" text NOT NULL,
  "input" jsonb,
  "output" jsonb,
  "error" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "duration" text
);--> statement-breakpoint

-- Recreate workflow_execution_logs table with text IDs
CREATE TABLE "workflow_execution_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "execution_id" text NOT NULL REFERENCES "workflow_executions"("id"),
  "node_id" text NOT NULL,
  "node_name" text NOT NULL,
  "node_type" text NOT NULL,
  "status" text NOT NULL,
  "input" jsonb,
  "output" jsonb,
  "error" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "duration" text
);--> statement-breakpoint

-- Recreate data_sources table with text IDs
CREATE TABLE "data_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "name" text NOT NULL,
  "type" text NOT NULL,
  "connection_string" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

