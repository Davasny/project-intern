ALTER TABLE "project" ADD COLUMN "default_temperature" numeric(2, 1) DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "temperature" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "selected_temperature" numeric(2, 1);