ALTER TABLE "activity_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "activity_log" CASCADE;--> statement-breakpoint
ALTER TABLE "task_record" RENAME TO "work_record";--> statement-breakpoint
ALTER TABLE "agent_run" RENAME TO "intern_run";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "agent_python_requirements" TO "intern_python_requirements";--> statement-breakpoint
ALTER TABLE "work_record" RENAME COLUMN "agent_run_id" TO "intern_run_id";--> statement-breakpoint
ALTER TABLE "intern_run" RENAME COLUMN "task_record_id" TO "work_record_id";--> statement-breakpoint
ALTER TABLE "intern_run" RENAME COLUMN "selected_agent" TO "selected_intern";--> statement-breakpoint
ALTER TABLE "work_record" DROP CONSTRAINT "task_record_task_id_task_id_fk";
--> statement-breakpoint
ALTER TABLE "work_record" DROP CONSTRAINT "task_record_record_id_record_id_fk";
--> statement-breakpoint
ALTER TABLE "intern_run" DROP CONSTRAINT "agent_run_task_record_id_task_record_id_fk";
--> statement-breakpoint
DROP INDEX "task_record_task_record_unique_idx";--> statement-breakpoint
DROP INDEX "task_record_record_state_idx";--> statement-breakpoint
DROP INDEX "task_record_task_state_idx";--> statement-breakpoint
DROP INDEX "task_record_one_active_execution_per_record_idx";--> statement-breakpoint
DROP INDEX "agent_run_task_record_attempt_unique_idx";--> statement-breakpoint
DROP INDEX "agent_run_task_record_created_at_idx";--> statement-breakpoint
ALTER TABLE "work_record" ADD CONSTRAINT "work_record_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_record" ADD CONSTRAINT "work_record_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intern_run" ADD CONSTRAINT "intern_run_work_record_id_work_record_id_fk" FOREIGN KEY ("work_record_id") REFERENCES "public"."work_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_record_work_record_unique_idx" ON "work_record" USING btree ("task_id","record_id");--> statement-breakpoint
CREATE INDEX "work_record_record_state_idx" ON "work_record" USING btree ("record_id","state");--> statement-breakpoint
CREATE INDEX "work_record_task_state_idx" ON "work_record" USING btree ("task_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "work_record_one_active_execution_per_record_idx" ON "work_record" USING btree ("record_id") WHERE "work_record"."state" in ('picked_up', 'in_progress');--> statement-breakpoint
CREATE UNIQUE INDEX "intern_run_work_record_attempt_unique_idx" ON "intern_run" USING btree ("work_record_id","attempt_number");--> statement-breakpoint
CREATE INDEX "intern_run_work_record_created_at_idx" ON "intern_run" USING btree ("work_record_id","created_at");