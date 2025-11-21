CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_vercel_project_id_unique";--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "vercel_project_id";--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "vercel_project_name";--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "deployment_status";--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "deployment_url";--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN "last_deployed_at";