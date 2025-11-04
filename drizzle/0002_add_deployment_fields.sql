-- Add deployment tracking fields to workflows table
ALTER TABLE "workflows" ADD COLUMN "deployment_status" text DEFAULT 'none';
ALTER TABLE "workflows" ADD COLUMN "deployment_url" text;
ALTER TABLE "workflows" ADD COLUMN "last_deployed_at" timestamp;

