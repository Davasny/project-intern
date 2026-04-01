ALTER TABLE "project" ADD COLUMN "is_autopick_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "source_schema_version_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "target_schema_version_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_source_schema_version_id_project_schema_version_id_fk" FOREIGN KEY ("source_schema_version_id") REFERENCES "public"."project_schema_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_target_schema_version_id_project_schema_version_id_fk" FOREIGN KEY ("target_schema_version_id") REFERENCES "public"."project_schema_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_target_schema_version_idx" ON "task" USING btree ("target_schema_version_id");