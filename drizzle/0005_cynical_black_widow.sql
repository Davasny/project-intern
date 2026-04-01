ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_record_id_record_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_related_project_id_project_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_related_record_id_record_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "record_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "related_project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "related_record_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "task_record_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN "agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "finished_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "tool_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "tool_call_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_run" ADD COLUMN "estimated_cost_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_task_record_id_task_record_id_fk" FOREIGN KEY ("task_record_id") REFERENCES "public"."task_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_agent_run_id_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_related_project_id_project_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_related_record_id_record_id_fk" FOREIGN KEY ("related_record_id") REFERENCES "public"."record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_project_created_at_idx" ON "activity_log" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_project_task_created_at_idx" ON "activity_log" USING btree ("project_id","task_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_task_record_created_at_idx" ON "activity_log" USING btree ("task_record_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_agent_run_created_at_idx" ON "activity_log" USING btree ("agent_run_id","created_at");