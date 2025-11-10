ALTER TABLE "projects" ADD COLUMN "resend_api_key" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "resend_from_email" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "linear_api_key" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "slack_api_key" text;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "resend_api_key";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "resend_from_email";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "linear_api_key";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "slack_api_key";