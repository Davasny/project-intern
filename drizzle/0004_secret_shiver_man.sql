CREATE TABLE "source_file" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"sha256" text NOT NULL,
	"storage_path" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"stage" text NOT NULL,
	"state" text NOT NULL,
	"source_hash" text NOT NULL,
	"pipeline_version" text NOT NULL,
	"format" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_definition" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"stages" jsonb NOT NULL,
	"parser_asset_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_run" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"task_record_id" uuid NOT NULL,
	"agent_run_id" uuid,
	"pipeline_definition_id" uuid,
	"pipeline_version" text NOT NULL,
	"stage" text NOT NULL,
	"state" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_file" ADD CONSTRAINT "source_file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_file" ADD CONSTRAINT "source_file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_file" ADD CONSTRAINT "source_file_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_file" ADD CONSTRAINT "source_file_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_file_id_source_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."source_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_definition" ADD CONSTRAINT "pipeline_definition_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_task_record_id_task_record_id_fk" FOREIGN KEY ("task_record_id") REFERENCES "public"."task_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_agent_run_id_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_pipeline_definition_id_pipeline_definition_id_fk" FOREIGN KEY ("pipeline_definition_id") REFERENCES "public"."pipeline_definition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_file_project_record_created_at_idx" ON "source_file" USING btree ("project_id","record_id","created_at");--> statement-breakpoint
CREATE INDEX "source_file_record_sha256_idx" ON "source_file" USING btree ("record_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_lineage_unique_idx" ON "artifact" USING btree ("record_id","file_id","stage","source_hash","pipeline_version");--> statement-breakpoint
CREATE INDEX "artifact_project_record_created_at_idx" ON "artifact" USING btree ("project_id","record_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_definition_project_version_unique_idx" ON "pipeline_definition" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "pipeline_definition_project_created_at_idx" ON "pipeline_definition" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "pipeline_run_project_record_created_at_idx" ON "pipeline_run" USING btree ("project_id","record_id","created_at");--> statement-breakpoint
CREATE INDEX "pipeline_run_task_record_created_at_idx" ON "pipeline_run" USING btree ("task_record_id","created_at");