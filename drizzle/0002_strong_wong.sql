CREATE TABLE "task_description_revision" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"task_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"description_markdown" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	"model" text,
	"schema_version" integer NOT NULL,
	"pipeline_version" text,
	"idempotency_key" text NOT NULL,
	"description_markdown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_record" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"task_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"state" text NOT NULL,
	"agent_run_id" uuid,
	"last_transition_at" timestamp with time zone NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"task_record_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"state" text NOT NULL,
	"selected_model" text,
	"selected_agent" text,
	"session_reference" text,
	"tool_activity_summary" jsonb NOT NULL,
	"result_payload" jsonb,
	"failure_payload" jsonb,
	"token_input" integer,
	"token_output" integer,
	"latency_ms" integer,
	"cost_usd" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_description_revision" ADD CONSTRAINT "task_description_revision_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_description_revision" ADD CONSTRAINT "task_description_revision_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_record" ADD CONSTRAINT "task_record_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_record" ADD CONSTRAINT "task_record_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_task_record_id_task_record_id_fk" FOREIGN KEY ("task_record_id") REFERENCES "public"."task_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_description_revision_task_revision_unique_idx" ON "task_description_revision" USING btree ("task_id","revision_number");--> statement-breakpoint
CREATE INDEX "task_description_revision_task_created_at_idx" ON "task_description_revision" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_project_sort_order_unique_idx" ON "task" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE INDEX "task_project_updated_at_idx" ON "task" USING btree ("project_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_record_task_record_unique_idx" ON "task_record" USING btree ("task_id","record_id");--> statement-breakpoint
CREATE INDEX "task_record_record_state_idx" ON "task_record" USING btree ("record_id","state");--> statement-breakpoint
CREATE INDEX "task_record_task_state_idx" ON "task_record" USING btree ("task_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "task_record_one_active_execution_per_record_idx" ON "task_record" USING btree ("record_id") WHERE "task_record"."state" in ('picked_up', 'in_progress');--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_task_record_attempt_unique_idx" ON "agent_run" USING btree ("task_record_id","attempt_number");--> statement-breakpoint
CREATE INDEX "agent_run_task_record_created_at_idx" ON "agent_run" USING btree ("task_record_id","created_at");