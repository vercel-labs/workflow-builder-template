ALTER TABLE "data_sources" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ALTER COLUMN "execution_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_executions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_executions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workflow_executions" ALTER COLUMN "workflow_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "id" DROP DEFAULT;