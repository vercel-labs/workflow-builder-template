ALTER TABLE "workflows" ADD COLUMN "deployment_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "deployment_url" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "last_deployed_at" timestamp;